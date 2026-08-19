package service

import (
	"reflect"
	"testing"
)

// TestNearbySpecialties_knownSpecialties pins the decision-tree closeness map
// used to fill recommendation slots when the exact specialty yields <5 cards.
func TestNearbySpecialties_knownSpecialties(t *testing.T) {
	tests := []struct {
		specialty string
		want      []string
	}{
		{"psychology", []string{"general-practice", "orthopedics", "psychiatry", "neuropsychology"}},
		{"psychiatry", []string{"psychology", "general-practice"}},
		{"neuropsychology", []string{"psychology", "orthopedics", "general-practice"}},
		{"orthopedics", []string{"general-practice", "psychology"}},
		{"general-practice", []string{"psychology", "orthopedics", "psychiatry", "neuropsychology"}},
	}
	for _, tt := range tests {
		got := nearbySpecialties(tt.specialty)
		if !reflect.DeepEqual(got, tt.want) {
			t.Errorf("nearbySpecialties(%q) = %v, want %v", tt.specialty, got, tt.want)
		}
	}
}

// TestNearbySpecialties_unknownSpecialty ensures unknown specialties fall back
// to an empty list so only exact matches are considered.
func TestNearbySpecialties_unknownSpecialty(t *testing.T) {
	for _, s := range []string{"cardiology", "", "MISSING"} {
		if got := nearbySpecialties(s); len(got) != 0 {
			t.Errorf("nearbySpecialties(%q) = %v, want empty", s, got)
		}
	}
}
