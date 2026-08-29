package main

import (
	"net/http"
	"path"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/konsulin-care/konsulin-app/internal/config"
	appmw "github.com/konsulin-care/konsulin-app/internal/middleware"
)

// registerProtectedPages sets up auth-guarded Next.js static pages.
func registerProtectedPages(r chi.Router, cfg *config.Config, outDir string, outFS, proxy http.Handler) {
	const unauthorizedPath = "/unauthorized"

	authGuard := appmw.AuthGuard(appmw.AuthGuardOptions{
		AuthPath:          cfg.AuthPath,
		CookieName:        cfg.AuthCookieName,
		CookieSecret:      cfg.SessionCookieSecret,
		AccessCookieName:  cfg.SessionCookieNameAccess,
		RefreshCookieName: cfg.SessionCookieNameRefresh,
		UnauthorizedPath:  unauthorizedPath,
		AppURL:            cfg.AppURL,
	})

	protectedRoutes := []string{"/journal", "/record", "/profile", "/remove-account"}
	for _, p := range protectedRoutes {
		p := p
		h := func(w http.ResponseWriter, r *http.Request) {
			// nolint:gosec // path.Clean + HasPrefix guard is the standard mitigation
			filePath := filepath.Join(outDir, path.Clean(strings.TrimPrefix(r.URL.Path, "/"))+".html")
			if !strings.HasPrefix(filepath.Clean(filePath), filepath.Clean(outDir)) {
				http.NotFound(w, r)
				return
			}
			http.ServeFile(w, r, filePath)
		}
		r.With(authGuard).MethodFunc(http.MethodGet, p, h)
		r.With(authGuard).MethodFunc(http.MethodHead, p, h)
		r.Handle(p+"/*", protectedPageHandler(authGuard, outDir, outFS))
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

	// Media upload — client sends image, BFF uploads to Cloudinary.
	registerMediaUpload(r, cfg, authGuard)
}
