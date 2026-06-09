package client

import "testing"

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
