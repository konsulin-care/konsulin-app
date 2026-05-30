package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/konsulin-care/konsulin-app/internal/session"
)

type AuthCookieOptions struct {
	CookieName   string
	CookieSecure bool
	CookieSecret string
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

	// Verify SuperTokens session token is present (lightweight security check).
	if _, err := r.Cookie("sAccessToken"); err != nil {
		slog.Warn("auth cookie: missing sAccessToken cookie", "userId", req.UserID)
		http.Error(w, "missing SuperTokens session", http.StatusUnauthorized)
		return
	}

	sess := &session.Session{
		UserID:          req.UserID,
		Roles:           req.Roles,
		Role:            req.Role,
		FHIRID:          req.FHIRID,
		ProfileComplete: req.ProfileComplete,
		FullName:        req.FullName,
		Email:           req.Email,
		PhoneNumber:     req.PhoneNumber,
		ProfilePicture:  req.ProfilePicture,
		Exp:             time.Now().Add(2 * time.Hour).Unix(),
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
		MaxAge:   int((2 * time.Hour).Seconds()),
	})

	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

func handleGetAuthCookie(w http.ResponseWriter, r *http.Request, opts AuthCookieOptions) {
	authenticated := false
	if _, err := session.ExtractFromRequest(r, opts.CookieName, opts.CookieSecret); err == nil {
		authenticated = true
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]bool{"authenticated": authenticated})
}

func handleDeleteAuthCookie(w http.ResponseWriter, r *http.Request, opts AuthCookieOptions) {
	clear := func(name string) {
		//nolint:gosec // G124: Secure depends on runtime env; HttpOnly and SameSite are set
		// NOSONAR go:S2092 - Secure depends on runtime env; always true on HTTPS production
		http.SetCookie(w, &http.Cookie{
			Name:     name,
			Value:    "",
			Path:     "/",
			HttpOnly: true,
			Secure:   opts.CookieSecure,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   -1,
		})
	}

	clear(opts.CookieName)
	clear("sAccessToken")
	clear("sRefreshToken")
	clear("sIdRefreshToken")

	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}
