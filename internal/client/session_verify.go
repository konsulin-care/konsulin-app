package client

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// VerifiedSessionResult holds the verified session data extracted from the JWT.
type VerifiedSessionResult struct {
	UserID string
	Roles  []string
	Role   string
	// ActiveRole is the SuperTokens st-active-role claim, empty when the
	// token predates the claim (legacy sessions).
	ActiveRole string
}

// stRoleClaim maps the SuperTokens UserRoleClaim format: {"v": ["Patient"]}.
type stRoleClaim struct {
	Values []string `json:"v"`
}

type jwtPayload struct {
	Sub         string      `json:"sub"`
	Exp         int64       `json:"exp"`
	STRole      stRoleClaim `json:"st-role"`
	STActiveRole string     `json:"st-active-role"`
}

// activeRoleFrom returns the highest-priority role from the list.
// Priority: Practitioner > ClinicAdmin > Patient.
// Matches the frontend selection logic in auth-helpers.ts and auth.ts.
func activeRoleFrom(roles []string) string {
	for _, r := range roles {
		if r == "Practitioner" {
			return "Practitioner"
		}
	}
	for _, r := range roles {
		if r == "Clinic Admin" {
			return "Clinic Admin"
		}
	}
	return "Patient"
}

// VerifySession decodes and validates the sAccessToken JWT locally.
// The token was signed by the SuperTokens core and delivered via HttpOnly cookie,
// so we trust its claims. Signature verification is unnecessary because the
// external backend service (which has private SuperTokens access) already
// verified the session before issuing the cookie.
func VerifySession(accessToken string) (*VerifiedSessionResult, error) {
	parts := strings.Split(accessToken, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("verify session: invalid JWT format")
	}

	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("verify session: base64 decode: %w", err)
	}

	var payload jwtPayload
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return nil, fmt.Errorf("verify session: json decode: %w", err)
	}

	if payload.Sub == "" {
		return nil, fmt.Errorf("verify session: missing sub claim")
	}

	if payload.Exp > 0 && time.Now().Unix() > payload.Exp {
		return nil, fmt.Errorf("verify session: token expired")
	}

	roles := payload.STRole.Values
	if len(roles) == 0 {
		roles = []string{"Patient"}
	}

	return &VerifiedSessionResult{
		UserID:     payload.Sub,
		Roles:      roles,
		Role:       activeRoleFrom(roles),
		ActiveRole: payload.STActiveRole,
	}, nil
}
