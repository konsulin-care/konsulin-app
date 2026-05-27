package middleware

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/konsulin-care/konsulin-app/internal/session"
)

type AuthGuardOptions struct {
	AuthPath   string
	CookieName string
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

			sess, err := session.ExtractFromRequest(r, opts.CookieName)
			if err != nil {
				slog.Debug("auth guard: no valid session", "path", r.URL.Path, "err", err)
				redirectURL := opts.AuthPath + "?redirect=" + r.URL.Path
				if r.URL.RawQuery != "" {
					redirectURL = opts.AuthPath + "?redirect=" + r.URL.Path + "%3F" + r.URL.RawQuery
				}

				if isHTMX(r) {
					w.Header().Set("HX-Redirect", redirectURL)
					w.WriteHeader(http.StatusOK)
				} else {
					//nolint:gosec // G710: redirect target is opts.AuthPath (config-controlled), not user input
					http.Redirect(w, r, redirectURL, http.StatusFound)
				}
				return
			}

			ctx := session.ContextWithSession(r.Context(), sess)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
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
