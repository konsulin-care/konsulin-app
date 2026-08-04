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
// | sFrontToken               | false    | Lax      | config | JWT exp | writeProxyResponse (via CookieMappings)|
//
//   - Cleared (MaxAge=-1) by logout handler, not SuperTokens.
//     ** HttpOnly=false required for client JS to read the value.

// stLastAccessTokenUpdateCookie is the non-httpOnly cookie set by writeProxyResponse
// so the SuperTokens frontend SDK can detect an active session.
//
// nolint:gosec // G101: cookie name, not a credential
const stLastAccessTokenUpdateCookie = "st-last-access-token-update"

// frontTokenCookie is the non-httpOnly cookie mirroring the backend front-token
// header so the SuperTokens frontend SDK can read session metadata from JS.
//
// nolint:gosec // G101: cookie name, not a credential
const frontTokenCookie = "sFrontToken"

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

		// nolint:gosec // G124: Secure depends on runtime env; HttpOnly and SameSite are set
		// nosemgrep — Secure follows runtime env (cfg.CookieSecure); always true on HTTPS production
		http.SetCookie(w, &http.Cookie{ //NOSONAR
			Name:     opts.CookieName,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
			Secure:   opts.SecureCookie,
			SameSite: http.SameSiteLaxMode,
		})

		// nolint:gosec // G124: same pattern, clearing access token
		// nosemgrep — Secure follows runtime env (cfg.CookieSecure); always true on HTTPS production
		http.SetCookie(w, &http.Cookie{ //NOSONAR
			Name:     opts.AccessCookieName,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
			Secure:   opts.SecureCookie,
			SameSite: http.SameSiteLaxMode,
		})

		// nolint:gosec // G124: same pattern, clearing refresh token
		// nosemgrep — Secure follows runtime env (cfg.CookieSecure); always true on HTTPS production
		http.SetCookie(w, &http.Cookie{ //NOSONAR
			Name:     opts.RefreshCookieName,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
			Secure:   opts.SecureCookie,
			SameSite: http.SameSiteLaxMode,
		})

		// nolint:gosec // G124: clearing id refresh token
		// nosemgrep — Secure follows runtime env (cfg.CookieSecure); always true on HTTPS production
		http.SetCookie(w, &http.Cookie{ //NOSONAR
			Name:     opts.IDRefreshCookieName,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
			Secure:   opts.SecureCookie,
			SameSite: http.SameSiteLaxMode,
		})

		// Clear the SDK's session existence tracking cookie.
		// nolint:gosec // G124: non-httpOnly also cleared the same way
		// nosemgrep — must stay JS-readable for the SuperTokens SDK; holds a timestamp, not a credential
		http.SetCookie(w, &http.Cookie{ //NOSONAR
			Name:     stLastAccessTokenUpdateCookie,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: false,
			Secure:   opts.SecureCookie,
			SameSite: http.SameSiteLaxMode,
		})

		// Clear the JS-visible front token set by the /api/v1/auth/* proxy.
		// nolint:gosec // G124: non-httpOnly to match how the cookie is set
		// nosemgrep — must stay JS-readable for the SuperTokens SDK
		http.SetCookie(w, &http.Cookie{ //NOSONAR
			Name:     frontTokenCookie,
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
