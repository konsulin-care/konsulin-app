// Package session provides cookie-based auth session parsing and context helpers.
package session

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

type Session struct {
	UserID          string `json:"userId"`
	Role            string `json:"role_name"`
	FHIRID          string `json:"fhirId"`
	ProfileComplete bool   `json:"profile_complete"`
	FullName        string `json:"fullname"`
	Email           string `json:"email"`
	PhoneNumber     string `json:"phoneNumber"`
	ProfilePicture  string `json:"profile_picture"`
}

type contextKey struct{}

var sessionKey contextKey

func ExtractFromRequest(r *http.Request, cookieName string) (*Session, error) {
	c, err := r.Cookie(cookieName)
	if err != nil {
		return nil, fmt.Errorf("session cookie %q: %w", cookieName, err)
	}
	if c.Value == "" {
		return nil, errors.New("session cookie is empty")
	}
	decoded, err := url.QueryUnescape(c.Value)
	if err != nil {
		decoded = c.Value
	}
	var s Session
	if err := json.Unmarshal([]byte(decoded), &s); err != nil {
		return nil, fmt.Errorf("parse session cookie: %w", err)
	}
	if s.UserID == "" {
		return nil, errors.New("session cookie missing userId")
	}
	if s.Role == "" {
		s.Role = "Guest"
	}
	return &s, nil
}

func ContextWithSession(ctx context.Context, s *Session) context.Context {
	return context.WithValue(ctx, sessionKey, s)
}

func SessionFromContext(ctx context.Context) (*Session, bool) {
	s, ok := ctx.Value(sessionKey).(*Session)
	return s, ok
}

const redirectPathMaxLength = 256

func ValidateRedirectPath(path string) (string, bool) {
	raw := strings.TrimSpace(path)
	if raw == "" {
		return "", false
	}
	if len(raw) > redirectPathMaxLength {
		return "", false
	}
	if strings.Contains(raw, "\\") {
		return "", false
	}
	if strings.ContainsAny(raw, "\r\n\t") {
		return "", false
	}
	if strings.Contains(raw, "://") {
		return "", false
	}
	if strings.HasPrefix(raw, "//") {
		return "", false
	}
	if !strings.HasPrefix(raw, "/") {
		return "", false
	}
	decoded, err := url.QueryUnescape(raw)
	if err != nil {
		return "", false
	}
	if strings.HasPrefix(decoded, "//") {
		return "", false
	}
	return decoded, true
}
