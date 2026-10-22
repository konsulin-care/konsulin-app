package main

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"

	"github.com/go-chi/chi/v5"
	"github.com/konsulin-care/konsulin-app/internal/config"
	"github.com/konsulin-care/konsulin-app/internal/handler"
	appmw "github.com/konsulin-care/konsulin-app/internal/middleware"
)

// registerAuthRoutes sets up authentication-related routes.
func registerAuthRoutes(r chi.Router, cfg *config.Config, outDir string, proxy http.Handler) {
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

	// /auth/* — serve Next.js auth page (static export or dev proxy).
	// In dev mode, rewrites to /auth so the dev server serves the auth SPA.
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
		for _, m := range []string{http.MethodGet, http.MethodHead} {
			r.MethodFunc(m, "/", authPageHandler)
			r.MethodFunc(m, "/*", authPageHandler)
		}
	})

	// Role switcher — GET returns partial, POST updates session cookie.
	r.HandleFunc("/auth/role/switch", handler.NewRoleSwitchHandler(handler.RoleSwitchOptions{
		CookieName:     cfg.AuthCookieName,
		CookieSecure:   cfg.CookieSecure,
		CookieSecret:   cfg.SessionCookieSecret,
		BackendBaseURL: cfg.APIURL,
	}))
}
