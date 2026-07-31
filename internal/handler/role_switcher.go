package handler

import (
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/konsulin-care/konsulin-app/internal/session"
)

type RoleSwitchOptions struct {
	CookieName     string
	CookieSecure   bool
	CookieSecret   string
	BackendBaseURL string
}

func NewRoleSwitchHandler(opts RoleSwitchOptions) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			handleRoleSwitch(w, r, opts)
			return
		}

		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleRoleSwitch(w http.ResponseWriter, r *http.Request, opts RoleSwitchOptions) {
	sess, ok := session.SessionFromContext(r.Context())
	if !ok || sess == nil {
		http.Error(w, "no session", http.StatusUnauthorized)
		return
	}

	newRole := strings.TrimSpace(r.FormValue("role"))
	if newRole == "" {
		http.Error(w, "missing role", http.StatusBadRequest)
		return
	}

	if !isRoleInSession(sess.Roles, newRole) {
		slog.Warn("role switch: invalid role requested", "requested", newRole, "available", sess.Roles)
		http.Error(w, "invalid role", http.StatusBadRequest)
		return
	}

	sess.Role = newRole
	sess.Exp = time.Now().Add(sessionLifetime).Unix()

	encoded, err := session.EncodeSession(sess, opts.CookieName)
	if err != nil {
		slog.Error("role switch: failed to encode session", "err", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	//nolint:gosec // G124: Secure depends on runtime env; always true on HTTPS production.
	http.SetCookie(w, &http.Cookie{
		Name:     opts.CookieName,
		Value:    encoded,
		Path:     "/",
		HttpOnly: true,
		Secure:   opts.CookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(sessionLifetime.Seconds()),
	})

	setActiveRoleClaim(w, r, opts, newRole)

	w.WriteHeader(http.StatusOK)
}

/** Push the active role into the SuperTokens session so the backend sees it. */
func setActiveRoleClaim(w http.ResponseWriter, r *http.Request, opts RoleSwitchOptions, role string) {
	if opts.BackendBaseURL == "" {
		return
	}
	body := strings.NewReader(fmt.Sprintf(`{"role":%q}`, role))
	// BackendBaseURL comes from server configuration, not user input — safe.
	//nolint:gosec
	req, err := http.NewRequest(http.MethodPost, opts.BackendBaseURL+"/api/v1/auth/active-role", body)
	if err != nil {
		slog.Warn("role switch: build active-role request failed", "err", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Cookie", r.Header.Get("Cookie"))
	req.Header.Set("rid", "anti-csrf")
	resp, err := backendProxyClient.Do(req)
	if err != nil {
		slog.Warn("role switch: active-role backend call failed", "err", err)
		return
	}
	defer func() { _ = resp.Body.Close() }()
	for _, c := range resp.Header.Values("Set-Cookie") {
		w.Header().Add("Set-Cookie", c)
	}
	if resp.StatusCode >= 300 {
		slog.Warn("role switch: active-role backend rejected", "status", resp.StatusCode)
	}
}

/** Check if a role exists in the session's role list. */
func isRoleInSession(roles []string, target string) bool {
	for _, role := range roles {
		if role == target {
			return true
		}
	}
	return false
}
