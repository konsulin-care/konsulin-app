package handler

import (
	"log/slog"
	"net/http"
	"net/url"
	"time"
)

var logoutClient = &http.Client{Timeout: 10 * time.Second}

type LogoutOptions struct {
	AuthPath          string
	CookieName        string
	AccessCookieName  string
	RefreshCookieName string
	BackendBaseURL    string
	SecureCookie      bool
}

func NewLogoutHandler(opts LogoutOptions) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if opts.BackendBaseURL != "" {
			go tryBackendLogout(r, opts.BackendBaseURL)
		}

		//nolint:gosec // G124: Secure depends on runtime env; HttpOnly and SameSite are set
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
		http.SetCookie(w, &http.Cookie{
			Name:     opts.RefreshCookieName,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
			Secure:   opts.SecureCookie,
			SameSite: http.SameSiteLaxMode,
		})

		http.Redirect(w, r, opts.AuthPath, http.StatusFound)
	}
}

func tryBackendLogout(r *http.Request, backendURL string) {
	signoutURL, err := url.JoinPath(backendURL, "/auth/signout")
	if err != nil {
		slog.Warn("logout: invalid backend URL", "err", err)
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
