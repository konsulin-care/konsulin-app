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
	"strings"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/konsulin-care/konsulin-app/internal/config"
	"github.com/konsulin-care/konsulin-app/internal/handler"
	appmw "github.com/konsulin-care/konsulin-app/internal/middleware"
)

// isRSCPayload returns true for Next.js RSC routing payloads (__next.*.txt).
func isRSCPayload(p string) bool {
	return strings.HasPrefix(filepath.Base(p), "__next.") && strings.HasSuffix(filepath.Base(p), ".txt")
}

// protectedPageHandler serves static HTML for protected routes, bypassing auth for RSC payloads.
func protectedPageHandler(authGuard func(http.Handler) http.Handler, outDir string, outFS http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if isRSCPayload(r.URL.Path) {
			outFS.ServeHTTP(w, r)
			return
		}
		authGuard(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			filePath := filepath.Join(outDir, path.Clean(strings.TrimPrefix(r.URL.Path, "/"))+".html")
			if !strings.HasPrefix(filepath.Clean(filePath), filepath.Clean(outDir)) {
				http.NotFound(w, r)
				return
			}
			http.ServeFile(w, r, filePath)
		})).ServeHTTP(w, r)
	}
}

func routes(cfg *config.Config) (http.Handler, error) {
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
			"/api/v1/auth/",
			"/api/v1/relay/",
			"/api/admin/",
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

	// Create the static file server for the Next.js export.
	// deepsource:ignore GO-S1034 — spaFS rejects non-root directory opens, so FileServer can never list the export dir.
	outFS := http.FileServer(&spaFS{http.Dir(outDir)})

	// Register route groups.
	registerAuthRoutes(r, cfg, outDir, proxy)
	registerAPIRoutes(r, cfg)
	registerProxyRoutes(r, cfg)
	registerProtectedPages(r, cfg, outDir, outFS, proxy)

	// Serve Next.js static export (out/) directly when it exists.
	// Uses spaFS to handle clean URLs (/clinic → out/clinic.html).
	if stat, err := os.Stat(outDir); err == nil && stat.IsDir() {
		r.NotFound(outFS.ServeHTTP)
	} else {
		r.NotFound(proxy.ServeHTTP)
	}
	return r, nil
}
