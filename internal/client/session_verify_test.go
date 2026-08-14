package client

import "testing"

// testJWTWithActiveRoleClinic is a JWT whose payload carries
// {"st-role":{"v":["Patient","Practitioner","Clinic Admin"]},"st-active-role":"Clinic Admin"}.
const testJWTWithActiveRoleClinic = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJleHAiOjk5OTk5OTk5OTksInN0LXJvbGUiOnsidiI6WyJQYXRpZW50IiwiUHJhY3RpdGlvbmVyIiwiQ2xpbmljIEFkbWluIl19LCJzdC1hY3RpdmUtcm9sZSI6IkNsaW5pYyBBZG1pbiJ9.ZmFrZS1zaWc"

// testJWTPatientNoActiveRole is a legacy JWT with roles but no st-active-role
// claim (issued before the active-role claim existed).
const testJWTPatientNoActiveRole = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJleHAiOjk5OTk5OTk5OTksInN0LXJvbGUiOnsidiI6WyJQYXRpZW50Il19fQ.ZmFrZS1zaWc"

func TestVerifySessionExtractsActiveRole(t *testing.T) {
	got, err := VerifySession(testJWTWithActiveRoleClinic)
	if err != nil {
		t.Fatalf("VerifySession: %v", err)
	}
	if got.ActiveRole != "Clinic Admin" {
		t.Errorf("expected ActiveRole %q, got %q", "Clinic Admin", got.ActiveRole)
	}
}

func TestVerifySessionActiveRoleEmptyWhenClaimAbsent(t *testing.T) {
	got, err := VerifySession(testJWTPatientNoActiveRole)
	if err != nil {
		t.Fatalf("VerifySession: %v", err)
	}
	if got.ActiveRole != "" {
		t.Errorf("expected empty ActiveRole for legacy token, got %q", got.ActiveRole)
	}
}

func TestActiveRoleFrom(t *testing.T) {
	tests := []struct {
		name  string
		roles []string
		want  string
	}{
		{
			name:  "Practitioner takes priority over Clinic Admin",
			roles: []string{"Practitioner", "Clinic Admin", "Patient"},
			want:  "Practitioner",
		},
		{
			name:  "Practitioner takes priority over Patient",
			roles: []string{"Patient", "Practitioner"},
			want:  "Practitioner",
		},
		{
			name:  "Clinic Admin is recognized when Practitioner absent",
			roles: []string{"Clinic Admin", "Patient"},
			want:  "Clinic Admin",
		},
		{
			name:  "Clinic Admin alone returns Clinic Admin",
			roles: []string{"Clinic Admin"},
			want:  "Clinic Admin",
		},
		{
			name:  "falls back to Patient for unrecognized roles",
			roles: []string{"ClinicAdmin"},
			want:  "Patient",
		},
		{
			name:  "falls back to Patient for empty roles",
			roles: []string{},
			want:  "Patient",
		},
		{
			name:  "Patient alone returns Patient",
			roles: []string{"Patient"},
			want:  "Patient",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := activeRoleFrom(tt.roles)
			if got != tt.want {
				t.Errorf("activeRoleFrom(%v) = %q, want %q", tt.roles, got, tt.want)
			}
		})
	}
}
