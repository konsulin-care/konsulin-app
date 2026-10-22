package handler

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

// nolint:gosec // G101: cookie name, not a credential
const lastAccessTokenUpdateCookie = "st-last-access-token-update"

// jwtExpiry extracts the exp claim from a JWT payload.
// JWT format: header.payload.signature, all base64url-encoded.
func jwtExpiry(token string) (time.Time, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return time.Time{}, errors.New("not a JWT")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return time.Time{}, fmt.Errorf("decode JWT payload: %w", err)
	}
	var claims struct {
		Exp int64 `json:"exp"`
	}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return time.Time{}, fmt.Errorf("parse JWT payload: %w", err)
	}
	if claims.Exp == 0 {
		return time.Time{}, errors.New("JWT has no exp claim")
	}
	return time.Unix(claims.Exp, 0), nil
}

// mappedCookieMaxAge returns the persistence duration for a mapped token
// cookie, derived from the token's JWT exp claim. Session-scoped cookies
// would be dropped on browser restart and defeat the 30-day session
// persistence used elsewhere (see sessionLifetime in auth_cookie.go).
// Falls back to the session lifetime when the claim can't be parsed or
// the token is already expired.
func mappedCookieMaxAge(token string) int {
	const minTTL = time.Minute
	exp, err := jwtExpiry(token)
	if err != nil {
		return int(sessionLifetime.Seconds())
	}
	ttl := time.Until(exp)
	if ttl < minTTL {
		return int(sessionLifetime.Seconds())
	}
	return int(ttl.Seconds())
}

// cookieNames extracts cookie names from a Cookie header value for debug logging.
func cookieNames(header string) []string {
	if header == "" {
		return nil
	}
	var names []string
	for _, part := range strings.Split(header, ";") {
		part = strings.TrimSpace(part)
		if idx := strings.IndexByte(part, '='); idx > 0 {
			names = append(names, part[:idx])
		}
	}
	return names
}
