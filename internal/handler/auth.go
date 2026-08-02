package handler

import (
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Cookie inventory:
//
// | Cookie                     | HttpOnly | SameSite | Secure | MaxAge  | Set in                               |
// | -------------------------- | -------- | -------- | ------ | ------- | ------------------------------------ |
// | auth                       | true     | Lax      | config | 2h      | NewAuthCookieHandler (POST)          |
// | sAccessToken               | true     | Lax      | config | -1*     | SuperTokens SDK                      |
// | sRefreshToken              | true     | Lax      | config | -1*     | SuperTokens SDK                      |
// | sIdRefreshToken            | true     | Lax      | config | -1*     | SuperTokens SDK                      |
// | anon_session               | true     | Lax      | config | 24h     | Backend API via proxy                |
// | redirect_intent            | false**  | Lax      | config | 300s    | RequireRole middleware               |
// | _gorilla_csrf              | true     | Lax      | config | session | CSRF middleware                      |
// | st-last-access-token-update| false    | Lax      | config | session | writeProxyResponse (via CookieMappings)|
//
//   - Cleared (MaxAge=-1) by logout handler, not SuperTokens.
//     ** HttpOnly=false required for client JS to read the value.

// stLastAccessTokenUpdateCookie is the non-httpOnly cookie set by writeProxyResponse
// so the SuperTokens frontend SDK can detect an active session.
//
//nolint:gosec // G101: cookie name, not a credential
const stLastAccessTokenUpdateCookie = "st-last-access-token-update"

var logoutClient = &http.Client{Timeout: 10 * time.Second}

type LogoutOptions struct {
	AuthPath                   string
	CookieName                 string
	AccessCookieName           string
	RefreshCookieName          string
	IDRefreshCookieName        string
	BackendBaseURL             string
	SecureCookie               bool
	AllowInsecureBackendLogout bool
}

func NewLogoutHandler(opts LogoutOptions) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if opts.BackendBaseURL != "" {
			go tryBackendLogout(r, opts.BackendBaseURL, opts.AllowInsecureBackendLogout)
		}

		//nolint:gosec // G124: Secure depends on runtime env; HttpOnly and SameSite are set
		// NOSONAR go:S2092 - Secure depends on runtime env; always true on HTTPS production
		http.SetCookie(w, &http.Cookie{
			Name:     opts.CookieName,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
			Secure:   opts.SecureCookie,
			SameSite: http.SameSiteLaxMode,
		})

		//nolint:gosec // G124: same pattern, clearing access token
		// NOSONAR go:S2092 - Secure depends on runtime env; always true on HTTPS production
		http.SetCookie(w, &http.Cookie{
			Name:     opts.AccessCookieName,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
			Secure:   opts.SecureCookie,
			SameSite: http.SameSiteLaxMode,
		})

		//nolint:gosec // G124: same pattern, clearing refresh token
		// NOSONAR go:S2092 - Secure depends on runtime env; always true on HTTPS production
		http.SetCookie(w, &http.Cookie{
			Name:     opts.RefreshCookieName,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
			Secure:   opts.SecureCookie,
			SameSite: http.SameSiteLaxMode,
		})

		//nolint:gosec // G124: clearing id refresh token
		// NOSONAR go:S2092 - Secure depends on runtime env; always true on HTTPS production
		http.SetCookie(w, &http.Cookie{
			Name:     opts.IDRefreshCookieName,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
			Secure:   opts.SecureCookie,
			SameSite: http.SameSiteLaxMode,
		})

		// Clear the SDK's session existence tracking cookie.
		//nolint:gosec // G124: non-httpOnly also cleared the same way
		// NOSONAR go:S2092 - Secure depends on runtime env; always true on HTTPS production
		http.SetCookie(w, &http.Cookie{
			Name:     stLastAccessTokenUpdateCookie,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: false,
			Secure:   opts.SecureCookie,
			SameSite: http.SameSiteLaxMode,
		})

		http.Redirect(w, r, opts.AuthPath, http.StatusFound)
	}
}

func tryBackendLogout(r *http.Request, backendURL string, allowInsecure bool) {
	signoutURL, err := url.JoinPath(backendURL, "/auth/signout")
	if err != nil {
		slog.Warn("logout: invalid backend URL", "err", err)
		return
	}

	if !allowInsecure && !strings.HasPrefix(backendURL, "https://") {
		slog.Warn("logout: skipping backend signout over non-HTTPS", "url", backendURL)
		return
	}

	req, err := http.NewRequest(http.MethodPost, signoutURL, http.NoBody)
	if err != nil {
		slog.Warn("logout: failed to create request", "err", err)
		return
	}
	req.Header.Set("Cookie", r.Header.Get("Cookie"))

	resp, err := logoutClient.Do(req)
	if err != nil {
		slog.Warn("logout: backend call failed", "err", err)
		return
	}
	_ = resp.Body.Close()
	slog.Debug("logout: backend signout", "status", resp.StatusCode)
}
