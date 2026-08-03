package main

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/konsulin-care/konsulin-app/internal/config"
	"github.com/konsulin-care/konsulin-app/internal/data/wilayah"
	"github.com/konsulin-care/konsulin-app/internal/handler"
	appmw "github.com/konsulin-care/konsulin-app/internal/middleware"
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

// spaFS wraps http.Dir to support clean URLs for static HTML export.
// If opening a path fails and the path has no file extension, it retries
// with ".html" appended. This lets /clinic serve out/clinic.html.
// Directories (e.g. _next/) are opened normally for FileServer's subfile handling.
type spaFS struct {
	http.Dir
}

func (f *spaFS) Open(name string) (http.File, error) {
	file, err := f.Dir.Open(name)
	if err != nil {
		if os.IsNotExist(err) && filepath.Ext(name) == "" {
			if file, err := f.Dir.Open(name + ".html"); err == nil {
				return file, nil
			}
		}
		return nil, err
	}
	// Flat HTML export uses files like clinic.html, so a directory at the
	// clean URL path (e.g. /clinic) is unexpected — prefer the .html variant.
	if path.Clean("/"+name) != "/" {
		if stat, _ := file.Stat(); stat != nil && stat.IsDir() {
			_ = file.Close()
			if file, err := f.Dir.Open(name + ".html"); err == nil {
				return file, nil
			}
			return nil, os.ErrNotExist
		}
	}
	return file, nil
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
	// cookie) into the request context without ever redirecting.
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
	// deepsource:ignore GO-S1034 — noDirFS rejects directory opens, so FileServer can never list the static dir.
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
		CookieName: cfg.AuthCookieName, CookieSecure: cfg.CookieSecure,
		CookieSecret: cfg.SessionCookieSecret, AccessCookieName: cfg.SessionCookieNameAccess,
		RefreshCookieName: cfg.SessionCookieNameRefresh, IDRefreshCookieName: cfg.SessionCookieNameIDRefresh,
	}))

	// CSRF token endpoint for POST /auth/cookie.
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

	// /auth/* — serve Next.js auth page (static export or dev proxy).
	// In dev mode, rewrites the path to /auth so the Next.js dev server
	// serves the auth SPA regardless of the sub-path (e.g. /auth/verify).
	// The SuperTokens SDK reads the original path from window.location
	// and handles routing via getRoutingComponent().
	authPageHandler := func(w http.ResponseWriter, r *http.Request) {
		authHTML := filepath.Join(outDir, "auth.html")
		if _, err := os.Stat(authHTML); err == nil {
			http.ServeFile(w, r, authHTML)
			return
		}
		r.URL.Path = "/auth"
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

	// Questionnaire create — new assessments must enter the catalog as drafts.
	// Exact-path match wins over the /proxy/* catch-all above.
	r.Post("/proxy/fhir/Questionnaire", handler.NewQuestionnaireCreateHandler(handler.QuestionnaireCreateOptions{
		BackendBaseURL:   cfg.APIURL,
		AccessCookieName: cfg.SessionCookieNameAccess,
	}))

	// SuperTokens API proxy — converts backend response headers to Set-Cookie.
	r.Handle("/api/v1/auth/*", handler.NewBackendProxyHandler(handler.BackendProxyOptions{
		BackendBaseURL: cfg.APIURL,
		CookieMappings: []handler.HeaderCookieMapping{
			{HeaderName: "st-access-token", CookieName: "sAccessToken", HTTPOnly: true},
			{HeaderName: "st-refresh-token", CookieName: "sRefreshToken", HTTPOnly: true},
			{HeaderName: "front-token", CookieName: "sFrontToken", HTTPOnly: false},
		},
		CookieSecure: cfg.CookieSecure,
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

	// Media upload — client sends image, BFF uploads to Cloudinary.
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
	// Uses spaFS to handle clean URLs (/clinic → out/clinic.html).
	if stat, err := os.Stat(outDir); err == nil && stat.IsDir() {
		// deepsource:ignore GO-S1034 — spaFS rejects non-root directory opens, so FileServer can never list the export dir.
		outFS := http.FileServer(&spaFS{http.Dir(outDir)})
		r.NotFound(outFS.ServeHTTP)
	} else {
		r.NotFound(proxy.ServeHTTP)
	}
	return r, nil
}
