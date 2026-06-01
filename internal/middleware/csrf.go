package middleware

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/gorilla/csrf"
)

type CSRFConfig struct {
	AuthKey        []byte
	Secure         bool
	ExemptPrefixes []string
}

func NewCSRFProtection(cfg CSRFConfig) func(http.Handler) http.Handler {
	csrfMw := csrf.Protect(cfg.AuthKey,
		csrf.Secure(cfg.Secure),
		csrf.HttpOnly(true),
		csrf.SameSite(csrf.SameSiteLaxMode),
		csrf.Path("/"),
		csrf.ErrorHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			slog.Warn("csrf: token validation failed", "path", r.URL.Path, "method", r.Method,
				"reason", csrf.FailureReason(r))
			http.Error(w, "Forbidden", http.StatusForbidden)
		})),
	)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			for _, prefix := range cfg.ExemptPrefixes {
				if strings.HasPrefix(r.URL.Path, prefix) {
					next.ServeHTTP(w, r)
					return
				}
			}
			if !cfg.Secure {
				r = csrf.PlaintextHTTPRequest(r)
			}
			csrfMw(next).ServeHTTP(w, r)
		})
	}
}

func CSRFToken(r *http.Request) string {
	return csrf.Token(r)
}

func CSRFFailureReason(r *http.Request) error {
	return csrf.FailureReason(r)
}
