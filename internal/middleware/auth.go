package middleware

import (
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"github.com/konsulin-care/konsulin-app/internal/session"
)

type AuthGuardOptions struct {
	AuthPath     string
	CookieName   string
	CookieSecret string
	AppURL       string // base URL for origin validation in redirects
	// SkipPaths lists path prefixes that bypass auth guard (e.g. "/health", "/static/").
	SkipPaths []string
}

func AuthGuard(opts AuthGuardOptions) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if isSkippedPath(r.URL.Path, opts) {
				next.ServeHTTP(w, r)
				return
			}

			// Early redirect path validation (WP3)
			if _, ok := session.ValidateRedirectPath(r.URL.Path, opts.AppURL); !ok {
				slog.Warn("auth guard: rejecting invalid path from request", "path", r.URL.Path)
				http.Redirect(w, r, opts.AuthPath, http.StatusFound)
				return
			}

			sess, err := session.ExtractFromRequest(r, opts.CookieName, opts.CookieSecret)
			if err != nil {
				redirectMissingSession(w, r, opts)
				return
			}

			ctx := session.ContextWithSession(r.Context(), sess)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func redirectMissingSession(w http.ResponseWriter, r *http.Request, opts AuthGuardOptions) {
	slog.Debug("auth guard: no valid session", "path", r.URL.Path)
	redirectURL := redirectURLForPath(r.URL.Path, opts.AuthPath, opts.AppURL)

	if isHTMX(r) {
		w.Header().Set("HX-Redirect", redirectURL)
		w.WriteHeader(http.StatusOK)
	} else {
		//nolint:gosec // G710: redirectURL validated by redirectURLForPath via ValidateRedirectPath
		http.Redirect(w, r, redirectURL, http.StatusFound)
	}
}

func redirectURLForPath(path, authPath, appURL string) string {
	if validated, ok := session.ValidateRedirectPath(path, appURL); ok {
		return authPath + "?redirectToPath=" + url.QueryEscape(validated)
	}
	slog.Warn("auth guard: rejected invalid redirect path", "path", path)
	return authPath
}

func RequireRole(roles ...string) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			sess, ok := session.SessionFromContext(r.Context())
			if !ok {
				http.Error(w, "unauthorized", http.StatusForbidden)
				return
			}
			for _, role := range roles {
				if sess.Role == role {
					next.ServeHTTP(w, r)
					return
				}
			}
			http.Error(w, "forbidden", http.StatusForbidden)
		})
	}
}

func isSkippedPath(path string, opts AuthGuardOptions) bool {
	if path == opts.AuthPath || strings.HasPrefix(path, opts.AuthPath+"/") {
		return true
	}
	for _, skip := range opts.SkipPaths {
		if strings.HasPrefix(path, skip) || path == skip {
			return true
		}
	}
	return false
}

func isHTMX(r *http.Request) bool {
	return r.Header.Get("HX-Request") == "true"
}
