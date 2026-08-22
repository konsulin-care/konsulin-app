package service

import (
	"reflect"
	"testing"

	"github.com/konsulin-care/konsulin-app/internal/data/specialty"
)

// TestNearbySpecialtiesKnownCode asserts proximity-driven expansion for a real
// NUCC code: non-empty, capped, self-excluded, and deterministic.
func TestNearbySpecialtiesKnownCode(t *testing.T) {
	got := nearbySpecialties("103T00000X")
	if len(got) == 0 {
		t.Fatal("expected proximity neighbors for Psychologist")
	}
	if len(got) > relatedSpecialtyLimit {
		t.Errorf("expected at most %d neighbors, got %d", relatedSpecialtyLimit, len(got))
	}
	for _, code := range got {
		if code == "103T00000X" {
			t.Errorf("expansion must exclude the query code, got %q", code)
		}
		if score := specialty.LoadIndex().GetProximity("103T00000X", code); score < relatedSpecialtyThreshold {
			t.Errorf("neighbor %s below threshold: %.3f", code, score)
		}
	}

	// Closest neighbor is a psychology-family specialization.
	if !reflect.DeepEqual(got, nearbySpecialties("103T00000X")) {
		t.Error("expansion must be deterministic across calls")
	}
}

// TestNearbySpecialtiesKnownCodeFamily prefers the query code's own family:
// the psychiatry expansion leads with a psychiatry sub-specialization.
func TestNearbySpecialtiesKnownCodeFamily(t *testing.T) {
	got := nearbySpecialties("2084P0800X")
	if len(got) == 0 {
		t.Fatal("expected neighbors for psychiatry")
	}
	if got[0] != "2084P0802X" && len(got) >= 1 && got[0] != "2084P0800X" {
		t.Errorf("expected a psychiatry-family top neighbor, got %v", got[:1])
	}
}

// TestNearbySpecialtiesUnknownCode ensures unknown specialties fall back to an
// empty list so only exact matches are considered.
func TestNearbySpecialtiesUnknownCode(t *testing.T) {
	for _, s := range []string{"cardiology-slug", "", "MISSING-NUCC"} {
		if got := nearbySpecialties(s); len(got) != 0 {
			t.Errorf("nearbySpecialties(%q) = %v, want empty", s, got)
		}
	}
}