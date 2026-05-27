package handler

import (
	"log/slog"
	"net/http"
	"net/url"
)

type LogoutOptions struct {
	AuthPath       string
	CookieName     string
	BackendBaseURL string
}

func NewLogoutHandler(opts LogoutOptions) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if opts.BackendBaseURL != "" {
			go tryBackendLogout(r, opts.BackendBaseURL)
		}

		http.SetCookie(w, &http.Cookie{
			Name:     opts.CookieName,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
			Secure:   r.TLS != nil,
			SameSite: http.SameSiteLaxMode,
		})
		http.SetCookie(w, &http.Cookie{
			Name:     "sAccessToken",
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
			Secure:   r.TLS != nil,
			SameSite: http.SameSiteLaxMode,
		})
		http.SetCookie(w, &http.Cookie{
			Name:     "sRefreshToken",
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
			Secure:   r.TLS != nil,
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

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		slog.Warn("logout: backend call failed", "err", err)
		return
	}
	_ = resp.Body.Close()
	slog.Debug("logout: backend signout", "status", resp.StatusCode)
}
