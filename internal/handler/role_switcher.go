package handler

import (
	"errors"
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

	// Sync the SuperTokens active-role claim BEFORE committing the cookie so
	// the BFF cookie and the backend session claim never diverge. On any
	// failure, fail closed: return 502 and leave the auth cookie untouched.
	if err := setActiveRoleClaim(w, r, opts, newRole); err != nil {
		slog.Error("role switch: active-role claim sync failed", "err", err)
		http.Error(w, "active role sync failed", http.StatusBadGateway)
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

	// nolint:gosec // G124: Secure depends on runtime env; always true on HTTPS production.
	http.SetCookie(w, &http.Cookie{
		Name:     opts.CookieName,
		Value:    encoded,
		Path:     "/",
		HttpOnly: true,
		Secure:   opts.CookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(sessionLifetime.Seconds()),
	})

	w.WriteHeader(http.StatusOK)
}

// Push the active role into the SuperTokens session so the backend sees it.
// On success, forwards the backend's Set-Cookie headers (re-issued
// SuperTokens tokens) to the client. Returns an error when the backend is
// not configured, unreachable, or rejects the update — in which case no
// headers are forwarded.
func setActiveRoleClaim(w http.ResponseWriter, r *http.Request, opts RoleSwitchOptions, role string) error {
	if opts.BackendBaseURL == "" {
		return errors.New("BackendBaseURL is not configured")
	}
	body := strings.NewReader(fmt.Sprintf(`{"role":%q}`, role))
	// BackendBaseURL comes from server configuration, not user input — safe.
	// nolint:gosec
	req, err := http.NewRequest(http.MethodPost, opts.BackendBaseURL+"/api/v1/auth/active-role", body)
	if err != nil {
		return fmt.Errorf("build active-role request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Cookie", r.Header.Get("Cookie"))
	req.Header.Set("rid", "anti-csrf")
	resp, err := backendProxyClient.Do(req)
	if err != nil {
		return fmt.Errorf("active-role backend call: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("active-role backend rejected with status %d", resp.StatusCode)
	}
	for _, c := range resp.Header.Values("Set-Cookie") {
		w.Header().Add("Set-Cookie", c)
	}
	return nil
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
