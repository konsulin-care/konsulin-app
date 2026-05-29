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
	CookieSecret string
	CookieSecure bool
}

type authCookieRequest struct {
	UserID          string   `json:"userId"`
	Roles           []string `json:"roles"`
	Role            string   `json:"role_name"`
	FHIRID          string `json:"fhirId"`
	ProfileComplete bool   `json:"profile_complete"`
	FullName        string `json:"fullname"`
	Email           string `json:"email"`
	PhoneNumber     string `json:"phoneNumber"`
	ProfilePicture  string `json:"profile_picture"`
}

var errMissingUserID = errors.New("missing required field: userId")

func NewAuthCookieHandler(opts AuthCookieOptions) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			handleSetAuthCookie(w, r, opts)
		case http.MethodDelete:
			handleDeleteAuthCookie(w, r, opts)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

func handleSetAuthCookie(w http.ResponseWriter, r *http.Request, opts AuthCookieOptions) {
	var req authCookieRequest
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
	}

	encoded, err := session.EncodeSession(sess)
	if err != nil {
		slog.Error("auth cookie: failed to encode session", "err", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	//nolint:gosec // G124: Secure depends on runtime env; HttpOnly and SameSite are set
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

func handleDeleteAuthCookie(w http.ResponseWriter, r *http.Request, opts AuthCookieOptions) {
	//nolint:gosec // G124: Secure depends on runtime env; HttpOnly and SameSite are set
	http.SetCookie(w, &http.Cookie{
		Name:     opts.CookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   opts.CookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})

	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}
