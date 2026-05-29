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
	r := chi.NewRouter()

	r.Use(chimw.RequestID)
	r.Use(appmw.NewLogger(slog.Default()))
	r.Use(chimw.Recoverer)

	// CSRF protection — applies to all state-changing Go SSR routes.
	// Exempt proxy, CSRF token endpoint, health, and static routes.
	if cfg.CSRFAuthKey != "" {
		if len(cfg.CSRFAuthKey) != 32 {
			slog.Error("CSRF_AUTH_KEY must be exactly 32 bytes, CSRF disabled",
				"length", len(cfg.CSRFAuthKey))
		} else {
			csrfMw := appmw.NewCSRFProtection(appmw.CSRFConfig{
				AuthKey: []byte(cfg.CSRFAuthKey),
				Secure:  cfg.CookieSecure,
				ExemptPrefixes: []string{
					"/api/config",
					"/proxy/",
					"/health",
					"/static/",
				},
			})
			r.Use(csrfMw)
		}
	}

	// Global soft auth — injects a session (real, guest, or new guest) for
	// every request without ever redirecting.  The guest_session cookie is set
	// once per guest and cached for subsequent requests.
	r.Use(appmw.OptionalAuth(appmw.OptionalAuthOptions{
		AuthCookieName:         cfg.AuthCookieName,
		GuestSessionCookieName: cfg.GuestSessionCookieName,
		CookieSecret:           cfg.SessionCookieSecret,
		BackendAPIURL:          cfg.APIURL + cfg.APIBasePath,
		CookieSecure:           cfg.CookieSecure,
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

	// /auth/* — serve Go SSR shell; redirect authenticated users to /
	r.Route("/auth", func(r chi.Router) {
		r.Use(appmw.RedirectAuthenticated(cfg.AuthCookieName, cfg.SessionCookieSecret, "/"))
		r.Get("/", handler.NewAuthPageHandler(cfg))
		r.Get("/*", handler.NewAuthPageHandler(cfg))
	})

	// Backend API proxy — adds Bearer token from sAccessToken cookie.
	r.Handle("/proxy/*", handler.NewBackendProxyHandler(handler.BackendProxyOptions{
		BackendBaseURL: cfg.APIURL,
	}))

	// Guest-allowed Go SSR routes — OptionalAuth provides the session, no
	// RequireRole needed.  These routes are accessible to all roles.
	// r.Get("/", handler.NewHomeHandler(...))

	// Protected Next.js pages (mirrors old middleware.ts route list).
	authGuard := appmw.AuthGuard(appmw.AuthGuardOptions{
		AuthPath:          cfg.AuthPath,
		CookieName:        cfg.AuthCookieName,
		CookieSecret:      cfg.SessionCookieSecret,
		AccessCookieName:  cfg.SessionCookieNameAccess,
		RefreshCookieName: cfg.SessionCookieNameRefresh,
		UnauthorizedPath:  "/unauthorized",
		AppURL:            cfg.AppURL,
	})
	protectedRoutes := []string{"/message", "/notification", "/journal", "/record", "/profile"}
	for _, p := range protectedRoutes {
		p := p
		r.With(authGuard).Handle(p, proxy)
		r.With(authGuard).Handle(p+"/*", proxy)
	}

	// Clinician-only routes.
	roleGuard := appmw.RequireRole(appmw.RequireRoleOptions{
		RedirectIntentCookieName: cfg.RedirectIntentCookieName,
		AuthPath:                 cfg.AuthPath,
		UnauthorizedPath:         "/unauthorized",
		CookieSecure:             cfg.CookieSecure,
		AppURL:                   cfg.AppURL,
	}, "Practitioner")
	r.With(authGuard, roleGuard).Handle("/assessments/soap", proxy)
	r.With(authGuard, roleGuard).Handle("/assessments/soap/*", proxy)

	// All unmatched routes — proxy without auth (public pages, _next/static, etc.).
	r.NotFound(proxy.ServeHTTP)

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
