package middleware

import (
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"github.com/konsulin-care/konsulin-app/internal/session"
)

// RequireRoleOptions configures the enhanced RequireRole middleware.
type RequireRoleOptions struct {
	RedirectIntentCookieName string
	AuthPath                 string
	UnauthorizedPath         string
	CookieSecure             bool
	AppURL                   string
}

type AuthGuardOptions struct {
	AuthPath          string
	CookieName        string
	CookieSecret      string
	AccessCookieName  string // SuperTokens access token cookie (fallback)
	RefreshCookieName string // SuperTokens refresh token cookie (fallback)
	UnauthorizedPath  string // redirect target for role violations
	AppURL            string // base URL for origin validation in redirects
	SkipPaths         []string
}

func AuthGuard(opts AuthGuardOptions) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if isSkippedPath(r.URL.Path, opts) {
				next.ServeHTTP(w, r)
				return
			}

			if _, ok := session.ValidateRedirectPath(r.URL.Path, opts.AppURL); !ok {
				slog.Warn("auth guard: rejecting invalid path from request", "path", r.URL.Path)
				http.Redirect(w, r, opts.AuthPath, http.StatusFound)
				return
			}

			sess, err := session.ExtractFromRequest(r, opts.CookieName, opts.CookieSecret)
			if err != nil {
				// SuperTokens fallback: if access or refresh token exists, allow through.
				// Client-side restoreAuthCookie will rebuild the auth cookie.
				if hasSuperTokensSession(r, opts) {
					next.ServeHTTP(w, r)
					return
				}
				redirectMissingSession(w, r, opts)
				return
			}

			ctx := session.ContextWithSession(r.Context(), sess)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// hasSuperTokensSession checks if the request carries SuperTokens session cookies.
func hasSuperTokensSession(r *http.Request, opts AuthGuardOptions) bool {
	if opts.AccessCookieName != "" {
		if c, err := r.Cookie(opts.AccessCookieName); err == nil && c.Value != "" {
			return true
		}
	}
	if opts.RefreshCookieName != "" {
		if c, err := r.Cookie(opts.RefreshCookieName); err == nil && c.Value != "" {
			return true
		}
	}
	return false
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

func RequireRole(opts RequireRoleOptions, roles ...string) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requireRoleHandler(w, r, next, opts, roles)
		})
	}
}

func requireRoleHandler(w http.ResponseWriter, r *http.Request, next http.Handler, opts RequireRoleOptions, roles []string) {
	sess, ok := session.SessionFromContext(r.Context())
	if !ok {
		redirectToUnauthorized(w, r, opts)
		return
	}

	if sess.Role == "Guest" && !containsRole(roles, "Guest") {
		if validatedPath, valid := session.ValidateRedirectPath(r.URL.Path, opts.AppURL); valid {
			//nolint:gosec // G124: HttpOnly=false required for JS to read redirect_intent cookie
			http.SetCookie(w, &http.Cookie{
				Name:     opts.RedirectIntentCookieName,
				Value:    url.QueryEscape(validatedPath),
				Path:     "/",
				MaxAge:   300,
				HttpOnly: false,
				Secure:   opts.CookieSecure,
				SameSite: http.SameSiteLaxMode,
			})
		}
		redirectToAuth(w, r, opts)
		return
	}

	for _, role := range roles {
		if sess.Role == role {
			next.ServeHTTP(w, r)
			return
		}
	}
	redirectToUnauthorized(w, r, opts)
}

func redirectToUnauthorized(w http.ResponseWriter, r *http.Request, opts RequireRoleOptions) {
	unauthorizedPath := opts.UnauthorizedPath
	if unauthorizedPath == "" {
		unauthorizedPath = "/unauthorized"
	}
	if isHTMX(r) {
		w.Header().Set("HX-Redirect", unauthorizedPath)
		w.WriteHeader(http.StatusOK)
	} else {
		http.Redirect(w, r, unauthorizedPath, http.StatusFound)
	}
}

func redirectToAuth(w http.ResponseWriter, r *http.Request, opts RequireRoleOptions) {
	if isHTMX(r) {
		w.Header().Set("HX-Redirect", opts.AuthPath)
		w.WriteHeader(http.StatusOK)
	} else {
		http.Redirect(w, r, opts.AuthPath, http.StatusFound)
	}
}

func containsRole(roles []string, role string) bool {
	for _, r := range roles {
		if r == role {
			return true
		}
	}
	return false
}

// RedirectAuthenticated redirects users with a valid auth cookie away from the given path prefix.
// Used to prevent authenticated users from accessing /auth pages.
func RedirectAuthenticated(cookieName, cookieSecret, redirectTarget string) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			sess, err := session.ExtractFromRequest(r, cookieName, cookieSecret)
			if err == nil && sess.UserID != "" {
				http.Redirect(w, r, redirectTarget, http.StatusFound)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func isSkippedPath(path string, opts AuthGuardOptions) bool {
	if path == opts.AuthPath || strings.HasPrefix(path, opts.AuthPath+"/") {
		return true
	}
	for _, skip := range opts.SkipPaths {
		if path == skip || strings.HasPrefix(path, skip+"/") || (strings.HasSuffix(skip, "/") && strings.HasPrefix(path, skip)) {
			return true
		}
	}
	return false
}

func isHTMX(r *http.Request) bool {
	return r.Header.Get("HX-Request") == "true"
}
