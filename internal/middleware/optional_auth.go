package middleware

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/konsulin-care/konsulin-app/internal/session"
)

type OptionalAuthOptions struct {
	AuthCookieName        string
	AnonSessionCookieName string
	CookieSecret          string
}

// OptionalAuth is a soft auth middleware that injects a session into the request
// context without ever redirecting. Priority: real auth cookie > anon session cookie.
func OptionalAuth(opts OptionalAuthOptions) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Tier 1: Real auth cookie (authenticated user)
			sess, err := session.ExtractFromRequest(r, opts.AuthCookieName, opts.CookieSecret)
			if err == nil {
				ctx := session.ContextWithSession(r.Context(), sess)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// Tier 2: Anonymous session cookie (JWT)
			sess, err = extractAnonSession(r, opts.AnonSessionCookieName)
			if err == nil {
				ctx := session.ContextWithSession(r.Context(), sess)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// Tier 3: No session found — proceed as Guest without ID
			sess = &session.Session{Role: "Guest"}
			ctx := session.ContextWithSession(r.Context(), sess)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func extractAnonSession(r *http.Request, cookieName string) (*session.Session, error) {
	c, err := r.Cookie(cookieName)
	if err != nil {
		return nil, err
	}
	if c.Value == "" {
		return nil, errors.New("anonymous session cookie is empty")
	}
	guestID, err := decodeGuestIDFromJWT(c.Value)
	if err != nil {
		return nil, err
	}
	return &session.Session{GuestID: guestID, Role: "Guest", Token: c.Value}, nil
}

// decodeGuestIDFromJWT extracts the guest_id claim from a JWT payload
// without verifying the signature. Verification happens at the backend.
func decodeGuestIDFromJWT(token string) (string, error) {
	parts := strings.SplitN(token, ".", 3)
	if len(parts) < 2 {
		return "", errors.New("invalid JWT: not enough segments")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return "", err
	}
	var claims struct {
		GuestID string `json:"guest_id"`
	}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return "", err
	}
	if claims.GuestID == "" {
		return "", errors.New("JWT missing guest_id claim")
	}
	return claims.GuestID, nil
}
