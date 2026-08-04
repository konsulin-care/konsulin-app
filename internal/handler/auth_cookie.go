package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/konsulin-care/konsulin-app/internal/client"
	"github.com/konsulin-care/konsulin-app/internal/session"
)

// AuthCookieOptions configures the auth cookie handler.
type AuthCookieOptions struct {
	CookieName          string
	CookieSecure        bool
	CookieSecret        string
	AccessCookieName    string
	RefreshCookieName   string
	IDRefreshCookieName string
}

type authCookieRequest struct {
	UserID          string   `json:"userId"`
	Roles           []string `json:"roles"`
	Role            string   `json:"role_name"`
	FHIRID          string   `json:"fhirId"`
	ProfileComplete bool     `json:"profile_complete"`
	FullName        string   `json:"fullname"`
	Email           string   `json:"email"`
	PhoneNumber     string   `json:"phoneNumber"`
	ProfilePicture  string   `json:"profile_picture"`
}

var errMissingUserID = errors.New("missing required field: userId")

// sessionLifetime mirrors the SuperTokens default session expiry (30 days) so
// the auth cookie never independently expires while the underlying session is
// still valid. The cookie is still refreshed on every page load via the
// restore flow when the access token is renewed.
const sessionLifetime = 30 * 24 * time.Hour

// NewAuthCookieHandler creates a handler for GET/POST/DELETE /auth/cookie.
func NewAuthCookieHandler(opts AuthCookieOptions) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			handleSetAuthCookie(w, r, opts)
		case http.MethodGet:
			handleGetAuthCookie(w, r, opts)
		case http.MethodDelete:
			handleDeleteAuthCookie(w, r, opts)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

func handleSetAuthCookie(w http.ResponseWriter, r *http.Request, opts AuthCookieOptions) {
	var req authCookieRequest
	r.Body = http.MaxBytesReader(w, r.Body, 10*1024)
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		slog.Warn("auth cookie: invalid request body", "err", err)
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.UserID == "" {
		slog.Warn("auth cookie: missing userId")
		http.Error(w, errMissingUserID.Error(), http.StatusBadRequest)
		return
	}

	// Verify SuperTokens session server-side.
	cookieName := opts.AccessCookieName
	if cookieName == "" {
		cookieName = "sAccessToken"
	}
	accessCookie, err := r.Cookie(cookieName)
	if err != nil {
		slog.Warn("auth cookie: missing access token cookie", "userId", req.UserID, "cookieName", cookieName)
		http.Error(w, "missing SuperTokens session", http.StatusUnauthorized)
		return
	}
	verified, err := client.VerifySession(accessCookie.Value)
	if err != nil {
		slog.Warn("auth cookie: SuperTokens session verification failed", "err", err)
		http.Error(w, "invalid SuperTokens session", http.StatusUnauthorized)
		return
	}

	sess := &session.Session{
		UserID: verified.UserID,
		Roles: func() []string {
			if len(req.Roles) > 0 {
				return req.Roles
			}
			return verified.Roles
		}(),
		Role: func() string {
			if req.Role != "" {
				return req.Role
			}
			return verified.Role
		}(),
		FHIRID:          req.FHIRID,
		ProfileComplete: req.ProfileComplete,
		FullName:        req.FullName,
		Email:           req.Email,
		PhoneNumber:     req.PhoneNumber,
		ProfilePicture:  req.ProfilePicture,
		Exp:             time.Now().Add(sessionLifetime).Unix(),
	}

	encoded, err := session.EncodeSession(sess, opts.CookieName)
	if err != nil {
		slog.Error("auth cookie: failed to encode session", "err", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	//nolint:gosec // G124: Secure depends on runtime env; HttpOnly and SameSite are set
	// NOSONAR go:S2092 - Secure depends on runtime env; always true on HTTPS production
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
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

type getAuthCookieResponse struct {
	Authenticated   bool     `json:"authenticated"`
	UserID          string   `json:"userId,omitempty"`
	Roles           []string `json:"roles,omitempty"`
	Role            string   `json:"role_name,omitempty"`
	FHIRID          string   `json:"fhirId,omitempty"`
	ProfileComplete bool     `json:"profile_complete"`
	FullName        string   `json:"fullname,omitempty"`
	Email           string   `json:"email,omitempty"`
	PhoneNumber     string   `json:"phoneNumber,omitempty"`
	ProfilePicture  string   `json:"profile_picture,omitempty"`
}

func handleGetAuthCookie(w http.ResponseWriter, r *http.Request, opts AuthCookieOptions) {
	resp := getAuthCookieResponse{}
	sess, err := session.ExtractFromRequest(r, opts.CookieName, opts.CookieSecret)
	if err == nil && sess != nil {
		resp.Authenticated = true
		resp.UserID = sess.UserID
		resp.Roles = sess.Roles
		resp.Role = sess.Role
		resp.FHIRID = sess.FHIRID
		resp.ProfileComplete = sess.ProfileComplete
		resp.FullName = sess.FullName
		resp.Email = sess.Email
		resp.PhoneNumber = sess.PhoneNumber
		resp.ProfilePicture = sess.ProfilePicture
	}
	w.Header().Set("Cache-Control", "no-store, private")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Vary", "Cookie")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

func handleDeleteAuthCookie(w http.ResponseWriter, _ *http.Request, opts AuthCookieOptions) {
	clearCookie := func(name string, httpOnly bool) {
		if name == "" {
			return
		}
		//nolint:gosec // G124: Secure depends on runtime env; HttpOnly and SameSite are set
		// NOSONAR go:S2092 - Secure depends on runtime env; always true on HTTPS production
		http.SetCookie(w, &http.Cookie{
			Name:     name,
			Value:    "",
			Path:     "/",
			HttpOnly: httpOnly,
			Secure:   opts.CookieSecure,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   -1,
		})
	}

	clearCookie(opts.CookieName, true)
	clearCookie(opts.AccessCookieName, true)
	clearCookie(opts.RefreshCookieName, true)
	clearCookie(opts.IDRefreshCookieName, true)
	clearCookie(stLastAccessTokenUpdateCookie, false)
	clearCookie(frontTokenCookie, false)

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
