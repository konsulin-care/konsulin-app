package main

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/konsulin-care/konsulin-app/internal/config"
	"github.com/konsulin-care/konsulin-app/internal/data/wilayah"
	"github.com/konsulin-care/konsulin-app/internal/handler"
	appmw "github.com/konsulin-care/konsulin-app/internal/middleware"
	"github.com/konsulin-care/konsulin-app/internal/session"
)

type noDirFS struct {
	http.Dir
}

func (d noDirFS) Open(name string) (http.File, error) {
	f, err := d.Dir.Open(name)
	if err != nil {
		return nil, err
	}
	stat, err := f.Stat()
	if err != nil {
		_ = f.Close()
		return nil, err
	}
	if stat.IsDir() {
		_ = f.Close()
		return nil, os.ErrNotExist
	}
	return f, nil
}

func routes(cfg *config.Config) (http.Handler, error) {
	const unauthorizedPath = "/unauthorized"
	r := chi.NewRouter()

	r.Use(chimw.RequestID)
	r.Use(appmw.NewLogger(slog.Default()))
	r.Use(chimw.Recoverer)

	// CSRF protection — applies to all state-changing Go SSR routes.
	// Exempt proxy, CSRF token endpoint, health, and static routes.
	if cfg.CSRFAuthKey == "" || len(cfg.CSRFAuthKey) != 32 {
		return nil, fmt.Errorf("CSRF_AUTH_KEY must be exactly 32 bytes, got length %d", len(cfg.CSRFAuthKey))
	}
	csrfMw := appmw.NewCSRFProtection(appmw.CSRFConfig{
		AuthKey: []byte(cfg.CSRFAuthKey),
		Secure:  cfg.CookieSecure,
		ExemptPrefixes: []string{
			"/api/config",
			"/proxy/",
			"/health",
			"/static/",
			"/api/v1/auth/",
			"/api/v1/relay/",
		},
	})
	r.Use(csrfMw)

	// Global soft auth — injects a session (real auth or anon_session JWT
	// cookie) into the request context without ever redirecting. The client
	// calls POST /api/v1/auth/anonymous-session (proxied to backend) which
	// sets the anon_session cookie; the middleware reads it passively.
	r.Use(appmw.OptionalAuth(appmw.OptionalAuthOptions{
		AuthCookieName:        cfg.AuthCookieName,
		AnonSessionCookieName: cfg.AnonSessionCookieName,
		CookieSecret:          cfg.SessionCookieSecret,
	}))

	proxyURL, err := url.Parse(cfg.NextjsURL)
	if err != nil {
		return nil, fmt.Errorf("invalid proxy target %q: %w", cfg.NextjsURL, err)
	}
	proxy := handler.NewReverseProxy(proxyURL)

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if err := json.NewEncoder(w).Encode(map[string]string{"status": "ok"}); err != nil {
			slog.Error("failed to encode health response", "err", err)
		}
	})

	wd, err := workingDir()
	if err != nil {
		return nil, err
	}
	outDir := filepath.Join(wd, "out")
	staticDir := filepath.Join(wd, "web", "static")
	// deepsource-disable-next-line GO-S1034
	// noDirFS prevents directory listing — false positive.
	fileServer := http.FileServer(noDirFS{http.Dir(staticDir)})
	r.Handle("/static/*", http.StripPrefix("/static/", fileServer))

	r.Post("/auth/logout", handler.NewLogoutHandler(handler.LogoutOptions{
		AuthPath:                   cfg.AuthPath,
		CookieName:                 cfg.AuthCookieName,
		AccessCookieName:           cfg.SessionCookieNameAccess,
		RefreshCookieName:          cfg.SessionCookieNameRefresh,
		IDRefreshCookieName:        cfg.SessionCookieNameIDRefresh,
		BackendBaseURL:             cfg.APIURL,
		SecureCookie:               cfg.CookieSecure,
		AllowInsecureBackendLogout: cfg.AllowInsecureBackendLogout,
	}))

	r.HandleFunc("/auth/cookie", handler.NewAuthCookieHandler(handler.AuthCookieOptions{
		CookieName:   cfg.AuthCookieName,
		CookieSecure: cfg.CookieSecure,
		CookieSecret: cfg.SessionCookieSecret,
	}))

	// CSRF token endpoint for POST /auth/cookie. GET requests bypass
	// CSRF validation but still set the _gorilla_csrf cookie, making
	// csrf.Token(r) available. The frontend fetches this before POST.
	r.Get("/auth/cookie/csrf-token", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"token": appmw.CSRFToken(r)})
	})

	r.Get("/api/config", handler.NewClientConfigHandler(handler.ClientConfigOptions{
		AppName:     cfg.AppName,
		APIURL:      cfg.APIURL,
		APIBasePath: cfg.APIBasePath,
		AuthPath:    cfg.AuthPath,
		AppURL:      cfg.AppURL,
		TXURL:       cfg.TXURL,
	}))

	// /auth/* — serve Next.js auth page. Serves out/auth.html in static export mode
	// (production) or proxies to Next.js in dev mode. The SuperTokens SDK handles
	// client-side routing for /auth/verify, /auth/callback/*, etc.
	authPageHandler := func(w http.ResponseWriter, r *http.Request) {
		authHTML := filepath.Join(outDir, "auth.html")
		if _, err := os.Stat(authHTML); err == nil {
			http.ServeFile(w, r, authHTML)
			return
		}
		proxy.ServeHTTP(w, r)
	}
	r.Route("/auth", func(r chi.Router) {
		r.Use(appmw.RedirectAuthenticated(cfg.AuthCookieName, cfg.SessionCookieSecret, "/"))
		r.Get("/", authPageHandler)
		r.Get("/*", authPageHandler)
	})

	// Backend API proxy — adds Bearer token from SuperTokens cookie.
	r.Handle("/proxy/*", handler.NewBackendProxyHandler(handler.BackendProxyOptions{
		BackendBaseURL:   cfg.APIURL,
		AccessCookieName: cfg.SessionCookieNameAccess,
	}))

	// SuperTokens API — proxy directly to backend, bypass Next.js.
	r.Handle("/api/v1/auth/*", handler.NewBackendProxyHandler(handler.BackendProxyOptions{
		BackendBaseURL: cfg.APIURL,
	}))

	// Role switcher — GET returns partial, POST updates session cookie.
	r.HandleFunc("/auth/role/switch", handler.NewRoleSwitchHandler(handler.RoleSwitchOptions{
		CookieName:     cfg.AuthCookieName,
		CookieSecure:   cfg.CookieSecure,
		CookieSecret:   cfg.SessionCookieSecret,
		BackendBaseURL: cfg.APIURL,
	}))

	// Protected Next.js pages (mirrors old middleware.ts route list).
	authGuard := appmw.AuthGuard(appmw.AuthGuardOptions{
		AuthPath:          cfg.AuthPath,
		CookieName:        cfg.AuthCookieName,
		CookieSecret:      cfg.SessionCookieSecret,
		AccessCookieName:  cfg.SessionCookieNameAccess,
		RefreshCookieName: cfg.SessionCookieNameRefresh,
		UnauthorizedPath:  unauthorizedPath,
		AppURL:            cfg.AppURL,
	})
	protectedRoutes := []string{"/journal", "/record", "/profile"}
	for _, p := range protectedRoutes {
		p := p
		r.With(authGuard).Handle(p, proxy)
		r.With(authGuard).Handle(p+"/*", proxy)
	}

	// Clinician-only routes.
	roleGuard := appmw.RequireRole(appmw.RequireRoleOptions{
		RedirectIntentCookieName: cfg.RedirectIntentCookieName,
		AuthPath:                 cfg.AuthPath,
		UnauthorizedPath:         unauthorizedPath,
		CookieSecure:             cfg.CookieSecure,
		AppURL:                   cfg.AppURL,
	}, "Practitioner")
	r.With(authGuard, roleGuard).Handle("/assessments/soap", proxy)
	r.With(authGuard, roleGuard).Handle("/assessments/soap/*", proxy)

	// Wilayah region data — serve from pre-built index, skip proxy.
	wh := handler.NewWilayahHandler(&wilayah.WilayahData)
	r.Get("/api/provinces", wh.Provinces)
	r.Get("/api/provinces/search", wh.ProvinceSearch)
	r.Get("/api/regencies/{provinceId}", wh.Regencies)
	r.Get("/api/regencies/search", wh.RegencySearch)
	r.Get("/api/districts/{regencyId}", wh.Districts)
	r.Get("/api/villages/{districtId}", wh.Villages)
	r.Get("/api/lookup/{id}", wh.Lookup)

	// Relay routes — BFF handles FHIR orchestration, not proxied.
	r.Post("/api/v1/relay/booking", handler.NewRelayBookingHandler(handler.RelayBookingOptions{
		BackendBaseURL:   cfg.APIURL,
		AccessCookieName: cfg.SessionCookieNameAccess,
	}))

	// Media upload — client sends image, BFF uploads to Cloudinary, returns URL.
	// Restricted to Clinic Admin role.
	adminGuard := appmw.RequireRole(appmw.RequireRoleOptions{
		RedirectIntentCookieName: cfg.RedirectIntentCookieName,
		AuthPath:                 cfg.AuthPath,
		UnauthorizedPath:         unauthorizedPath,
		CookieSecure:             cfg.CookieSecure,
		AppURL:                   cfg.AppURL,
	}, "Clinic Admin")
	r.With(authGuard, adminGuard).Post("/api/media/location", handler.NewUploadHandler(handler.UploadOptions{
		CloudinaryCloudName:    cfg.CloudinaryCloudName,
		CloudinaryUploadPreset: cfg.CloudinaryUploadPreset,
	}))

	// Serve Next.js static export (out/) directly when it exists.
	// When absent (e.g., development), fall back to the reverse proxy.
	if stat, err := os.Stat(outDir); err == nil && stat.IsDir() {
		outFS := http.FileServer(http.Dir(outDir))
		r.NotFound(outFS.ServeHTTP)
	} else {
		// All unmatched routes — proxy without auth (public pages, _next/static, etc.).
		r.NotFound(proxy.ServeHTTP)
	}

	return r, nil
}

func workingDir() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("failed to get working directory: %w", err)
	}
	return wd, nil
}

func setLogLevel(level string) {
	switch strings.ToLower(level) {
	case "debug":
		slog.SetLogLoggerLevel(slog.LevelDebug)
	case "warn":
		slog.SetLogLoggerLevel(slog.LevelWarn)
	case "error":
		slog.SetLogLoggerLevel(slog.LevelError)
	default:
		slog.SetLogLoggerLevel(slog.LevelInfo)
	}
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "err", err)
		os.Exit(1)
	}
	setLogLevel(cfg.LogLevel)

	session.InitSecureCookie(cfg.SessionCookieSecret)
	session.AllowUnsigned = cfg.AllowUnsignedCookies

	handler, err := routes(cfg)
	if err != nil {
		slog.Error("failed to set up routes", "err", err)
		os.Exit(1)
	}

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           handler,
		ReadTimeout:       10 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	slog.Info("starting server", "port", cfg.Port)
	if err := srv.ListenAndServe(); err != nil {
		slog.Error("server failed", "err", err)
		os.Exit(1)
	}
}
