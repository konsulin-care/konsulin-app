package handler

import (
	"encoding/json"
	"io"
	"net/http"
)

// AdminKeyOptions configures the BFF-held superadmin key handler.
type AdminKeyOptions struct {
	CookieName   string
	CookieSecure bool
}

const defaultSuperadminKeyCookieName = "superadmin_key"

const superadminKeyCookiePath = "/"

// NewAdminKeyHandler returns the superadmin key custody handler.
//
// POST /api/admin/key stores the submitted key in an HttpOnly, Secure,
// SameSite=Lax cookie so client-side JS can never read it. Validation is
// intentionally deferred to the backend — the BFF only relays the key on
// proxied requests (lazy backend enforcement).
// DELETE /api/admin/key clears the stored key cookie.
func NewAdminKeyHandler(opts AdminKeyOptions) http.HandlerFunc {
	cookieName := opts.CookieName
	if cookieName == "" {
		cookieName = defaultSuperadminKeyCookieName
	}

	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			setAdminKeyCookie(w, r, cookieName, opts.CookieSecure)
		case http.MethodDelete:
			clearAdminKeyCookie(w, cookieName, opts.CookieSecure)
		default:
			sendError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
	}
}

// setAdminKeyCookie reads the apiKey from the request body and stores it in
// the HttpOnly cookie. An empty or missing key is rejected with 400.
func setAdminKeyCookie(w http.ResponseWriter, r *http.Request, cookieName string, secure bool) {
	var payload struct {
		APIKey string `json:"apiKey"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 64<<10)).Decode(&payload); err != nil {
		sendError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if payload.APIKey == "" {
		sendError(w, http.StatusBadRequest, "apiKey is required")
		return
	}
	// nolint:gosec // G124: Secure and HttpOnly are set explicitly here.
	// nosemgrep — HttpOnly/Secure follow CookieSecure from runtime env (routes.go).
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    payload.APIKey,
		Path:     superadminKeyCookiePath,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	})
	writeAdminKeySuccess(w)
}

// clearAdminKeyCookie expires the stored key cookie (MaxAge < 0).
func clearAdminKeyCookie(w http.ResponseWriter, cookieName string, secure bool) {
	// nolint:gosec // G124: Secure and HttpOnly are set explicitly here.
	// nosemgrep — HttpOnly/Secure follow CookieSecure from runtime env (routes.go).
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    "",
		Path:     superadminKeyCookiePath,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
	writeAdminKeySuccess(w)
}

func writeAdminKeySuccess(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
