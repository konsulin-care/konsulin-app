package service

import (
	"context"
	"testing"

	"github.com/konsulin-care/konsulin-app/internal/data/specialty"
)

// TestBuildCascadeURLs_returnsFourLevels verifies the cascade builds 4 levels
// for a NUCC code and expands the related levels from ontology proximity.
func TestBuildCascadeURLs_returnsFourLevels(t *testing.T) {
	levels := buildCascadeURLs("207X00000X", -6.19, 106.8)

	if len(levels) != 4 {
		t.Fatalf("expected 4 cascade levels, got %d", len(levels))
	}

	// Level 1: exact, 10km
	if levels[0].radiusKm != 10 {
		t.Errorf("level 1: expected radiusKm=10, got %d", levels[0].radiusKm)
	}
	if len(levels[0].specialties) != 1 || levels[0].specialties[0] != "207X00000X" {
		t.Errorf("level 1: expected [207X00000X], got %v", levels[0].specialties)
	}

	// Level 2: exact + proximity-expanded neighbors, 10km
	if levels[1].radiusKm != 10 {
		t.Errorf("level 2: expected radiusKm=10, got %d", levels[1].radiusKm)
	}
	if levels[1].specialties[0] != "207X00000X" {
		t.Errorf("level 2: expected first specialty 207X00000X, got %v", levels[1].specialties)
	}
	if len(levels[1].specialties) <= 1 {
		t.Errorf("level 2: expected proximity-expanded specialties, got %d", len(levels[1].specialties))
	}
	for _, code := range levels[1].specialties[1:] {
		if code == "207X00000X" {
			t.Errorf("level 2: expansion must exclude the query code")
		}
	}

	// Level 3: exact, 25km
	if levels[2].radiusKm != 25 {
		t.Errorf("level 3: expected radiusKm=25, got %d", levels[2].radiusKm)
	}
	if len(levels[2].specialties) != 1 || levels[2].specialties[0] != "207X00000X" {
		t.Errorf("level 3: expected [207X00000X], got %v", levels[2].specialties)
	}

	// Level 4: exact + proximity, no location filter
	if levels[3].radiusKm != 0 {
		t.Errorf("level 4: expected radiusKm=0, got %d", levels[3].radiusKm)
	}
}

// TestFetchWithLocation_returnsLevel1WhenSufficient verifies the cascade
// stops at level 1 when it has >= maxRecommendations results.
func TestFetchWithLocation_returnsLevel1WhenSufficient(t *testing.T) {
	// Level 1: orthopaedics at 10km -> 5 exact results, already sufficient.
	pracIDs := []string{"p1", "p2", "p3", "p4", "p5"}
	level1Bundle := multiRoleSearchset("207X00000X", "Orthopaedic Surgery Physician", pracIDs)

	bundles := map[string]map[string]any{
		"207X00000X": level1Bundle,
	}

	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecommendationService(t, b)

	recs, err := svc.FetchWithLocation(context.Background(), FetchParams{
		Specialty: "207X00000X",
		Latitude:  lat(-6.19),
		Longitude: lat(106.8),
	})
	if err != nil {
		t.Fatalf("FetchWithLocation returned error: %v", err)
	}

	if len(recs) != 5 {
		t.Fatalf("expected 5 recommendations from level 1, got %d", len(recs))
	}
}

// TestFetchWithLocation_cascadesWhenLevel1Insufficient verifies the cascade
// moves through proximity-expanded levels when level 1 has < 5 results.
func TestFetchWithLocation_cascadesWhenLevel1Insufficient(t *testing.T) {
	// Level 1: orthopaedics at 10km -> 1 result
	// Level 2: orthopaedics + proximity neighbors -> 3 results
	level1Bundle := roleSearchset("207X00000X", "Orthopaedic Surgery Physician", "prc-10", "role-10", "loc-10", "hs-10", "sch-10", 60000)
	neighborBundle := multiRoleSearchset("207XS0117X", "Orthopaedic Surgery of the Spine Physician", []string{"p1", "p2"})

	bundles := map[string]map[string]any{
		"207X00000X": level1Bundle,
		"207XS0117X": neighborBundle,
	}

	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecommendationService(t, b)

	recs, err := svc.FetchWithLocation(context.Background(), FetchParams{
		Specialty: "207X00000X",
		Latitude:  lat(-6.19),
		Longitude: lat(106.8),
	})
	if err != nil {
		t.Fatalf("FetchWithLocation returned error: %v", err)
	}

	across := map[string]bool{}
	for _, r := range recs {
		across[r.PractitionerID] = true
	}
	if len(across) < 2 {
		t.Errorf("expected at least 2 distinct practitioners after cascade, got %d", len(across))
	}
}

// TestFetchWithLocation_fallbackToNoFilter verifies the cascade falls back
// to no location filter when all location-filtered levels have < 5 results.
func TestFetchWithLocation_fallbackToNoFilter(t *testing.T) {
	// Only 1 orthopaedics practitioner, no nearby specialties with location
	level1Bundle := roleSearchset("207X00000X", "Orthopaedic Surgery Physician", "prc-10", "role-10", "loc-10", "hs-10", "sch-10", 60000)

	bundles := map[string]map[string]any{
		"207X00000X": level1Bundle,
	}

	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecommendationService(t, b)

	recs, err := svc.FetchWithLocation(context.Background(), FetchParams{
		Specialty: "207X00000X",
		Latitude:  lat(-6.19),
		Longitude: lat(106.8),
	})
	if err != nil {
		t.Fatalf("FetchWithLocation returned error: %v", err)
	}

	// Should get at least 1 result (from fallback)
	if len(recs) == 0 {
		t.Error("expected at least 1 recommendation from fallback, got 0")
	}
}

// TestFetchWithLocation_usesLegacyWhenNoCoords verifies FetchWithLocation
// delegates to legacy path when no lat/lon provided.
func TestFetchWithLocation_usesLegacyWhenNoCoords(t *testing.T) {
	// Exact psychologist (1 role) + a proximity-expanded psychology
	// sub-specialization (4 roles) fill the legacy path to five.
	neighbors := specialty.LoadIndex().NearbyNuccCodes("103T00000X", relatedSpecialtyLimit, relatedSpecialtyThreshold)
	if len(neighbors) == 0 {
		t.Fatal("expected proximity neighbors for Psychologist")
	}
	bundles := map[string]map[string]any{
		"103T00000X": psychologySearchset(),
		neighbors[0]:  multiRoleSearchset(neighbors[0], "Psychology specialization", []string{"p1", "p2", "p3", "p4"}),
	}
	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecommendationService(t, b)

	// FetchWithLocation with no coords should use legacy path
	recs, err := svc.FetchWithLocation(context.Background(), FetchParams{
		Specialty: "103T00000X",
	})
	if err != nil {
		t.Fatalf("FetchWithLocation returned error: %v", err)
	}

	// Legacy path returns 5 (exact + proximity fill)
	if len(recs) != 5 {
		t.Errorf("expected 5 recommendations from legacy path, got %d", len(recs))
	}
}

// TestFetchWithLocation_singleBatchRequest verifies the cascade uses a single
// FHIR batch request (not 4 sequential requests).
func TestFetchWithLocation_singleBatchRequest(t *testing.T) {
	bundles := map[string]map[string]any{
		"207X00000X": multiRoleSearchset("207X00000X", "Orthopaedic Surgery Physician", []string{"p1", "p2", "p3", "p4", "p5"}),
	}

	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecommendationService(t, b)

	_, err := svc.FetchWithLocation(context.Background(), FetchParams{
		Specialty: "207X00000X",
		Latitude:  lat(-6.19),
		Longitude: lat(106.8),
	})
	if err != nil {
		t.Fatalf("FetchWithLocation returned error: %v", err)
	}

	// Should be exactly 1 batch request
	if b.hits != 1 {
		t.Errorf("expected exactly 1 FHIR batch request, got %d", b.hits)
	}
}
