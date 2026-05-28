// Package session provides cookie-based auth session parsing and context helpers.
package session

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
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
	GuestID         string `json:"-"`
}

type contextKey struct{}

var sessionKey contextKey

// signValue returns base64url(value) + "." + base64url(hmac-sha256(base64url(value), secret)).
func signValue(value, secret string) string {
	enc := base64.RawURLEncoding.EncodeToString([]byte(value))
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(enc))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return enc + "." + sig
}

// verifySignedValue splits a signed cookie value, verifies the HMAC, and returns the original value.
func verifySignedValue(signed, secret string) (string, bool) {
	dot := strings.LastIndex(signed, ".")
	if dot < 0 {
		return "", false
	}
	enc, sigStr := signed[:dot], signed[dot+1:]
	if enc == "" || sigStr == "" {
		return "", false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(enc))
	expected := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(sigStr), []byte(expected)) {
		return "", false
	}
	raw, err := base64.RawURLEncoding.DecodeString(enc)
	if err != nil {
		return "", false
	}
	return string(raw), true
}

func ExtractFromRequest(r *http.Request, cookieName, secret string) (*Session, error) {
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
	// Try signed format first (backward compat with HMAC-signed cookies, ~2h TTL).
	plain, ok := verifySignedValue(decoded, secret)
	if ok {
		if err := json.Unmarshal([]byte(plain), &s); err != nil {
			return nil, fmt.Errorf("parse session cookie: %w", err)
		}
	} else {
		// New unsigned format: decoded is the plain JSON string.
		if err := json.Unmarshal([]byte(decoded), &s); err != nil {
			return nil, errors.New("session cookie: invalid format")
		}
	}
	if s.UserID == "" {
		return nil, errors.New("session cookie missing userId")
	}
	if s.Role == "" {
		s.Role = "Guest"
	}
	return &s, nil
}

// SignCookieValue signs a JSON session payload for cookie storage.
// Used by cookie-setting endpoints (plan 004c) and the Next.js server action.
func SignCookieValue(value, secret string) string {
	return signValue(value, secret)
}

func ContextWithSession(ctx context.Context, s *Session) context.Context {
	return context.WithValue(ctx, sessionKey, s)
}

func SessionFromContext(ctx context.Context) (*Session, bool) {
	s, ok := ctx.Value(sessionKey).(*Session)
	return s, ok
}

const redirectPathMaxLength = 256

func validateRedirectFormat(path string) (string, bool) {
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
	if strings.Contains(decoded, "\\") {
		return "", false
	}
	if strings.ContainsAny(decoded, "\r\n\t") {
		return "", false
	}
	if strings.Contains(decoded, "://") {
		return "", false
	}
	if strings.HasPrefix(decoded, "//") {
		return "", false
	}
	return decoded, true
}

func validateRedirectOrigin(decoded, baseURL string) bool {
	if baseURL == "" {
		return true
	}
	base, err := url.Parse(baseURL)
	if err != nil || base.Scheme == "" || base.Host == "" {
		return false
	}
	parsed, err := url.Parse(decoded)
	if err != nil {
		return false
	}
	resolved := base.ResolveReference(parsed)
	return resolved.Scheme == base.Scheme && resolved.Host == base.Host
}

func ValidateRedirectPath(path, baseURL string) (string, bool) {
	decoded, ok := validateRedirectFormat(path)
	if !ok {
		return "", false
	}
	if !validateRedirectOrigin(decoded, baseURL) {
		return "", false
	}
	return decoded, true
}
