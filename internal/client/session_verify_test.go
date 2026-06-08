package client

import "testing"

func TestActiveRoleFrom(t *testing.T) {
	tests := []struct {
		name  string
		roles []string
		want  string
	}{
		{
			name:  "Practitioner takes priority over ClinicAdmin",
			roles: []string{"Practitioner", "ClinicAdmin", "Patient"},
			want:  "Practitioner",
		},
		{
			name:  "Practitioner takes priority over Patient",
			roles: []string{"Patient", "Practitioner"},
			want:  "Practitioner",
		},
		{
			name:  "ClinicAdmin is recognized when Practitioner absent",
			roles: []string{"ClinicAdmin", "Patient"},
			want:  "ClinicAdmin",
		},
		{
			name:  "ClinicAdmin alone returns ClinicAdmin",
			roles: []string{"ClinicAdmin"},
			want:  "ClinicAdmin",
		},
		{
			name:  "falls back to Patient for unrecognized roles",
			roles: []string{"SomeOtherRole"},
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
