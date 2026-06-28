package handler

import (
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/konsulin-care/konsulin-app/internal/client"
	"github.com/konsulin-care/konsulin-app/internal/session"
	"github.com/konsulin-care/konsulin-app/web/template/partials"
)

type RoleSwitchOptions struct {
	CookieName   string
	CookieSecure bool
	CookieSecret string
}

func NewRoleSwitchHandler(opts RoleSwitchOptions) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			handleRoleSwitch(w, r, opts)
			return
		}
		if r.Method == http.MethodGet {
			handleRoleSwitcherPartial(w, r)
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

	if !isRoleInSession(sess.Roles, newRole) && !isRoleInAccessToken(r, newRole) {
		slog.Warn("role switch: invalid role requested", "requested", newRole, "available", sess.Roles)
		http.Error(w, "invalid role", http.StatusBadRequest)
		return
	}

	sess.Role = newRole
	sess.Exp = time.Now().Add(2 * time.Hour).Unix()

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
		MaxAge:   int((2 * time.Hour).Seconds()),
	})

	w.Header().Set("HX-Redirect", "/")
	w.WriteHeader(http.StatusOK)
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

/**
 * Check if a role exists in the SuperTokens access token JWT.
 * Used as a fallback when the auth cookie has stale roles.
 */
func isRoleInAccessToken(r *http.Request, target string) bool {
	accessCookie, err := r.Cookie("sAccessToken")
	if err != nil {
		return false
	}
	verified, verifyErr := client.VerifySession(accessCookie.Value)
	if verifyErr != nil {
		return false
	}
	for _, role := range verified.Roles {
		if role == target {
			return true
		}
	}
	return false
}

func handleRoleSwitcherPartial(w http.ResponseWriter, r *http.Request) {
	sess, ok := session.SessionFromContext(r.Context())
	if !ok || sess == nil {
		http.Error(w, "no session", http.StatusUnauthorized)
		return
	}

	if len(sess.Roles) <= 1 {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	if err := partials.RoleSwitcher(sess.Role, sess.Roles).Render(r.Context(), w); err != nil {
		slog.Error("role switcher partial: render failed", "err", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
	}
}
