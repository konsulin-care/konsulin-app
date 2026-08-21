package service

import (
	"context"
	"testing"
)

// TestBuildCascadeURLs_returnsFourLevels verifies the cascade builds 4 levels.
func TestBuildCascadeURLs_returnsFourLevels(t *testing.T) {
	levels := buildCascadeURLs("orthopedics", -6.19, 106.8)

	if len(levels) != 4 {
		t.Fatalf("expected 4 cascade levels, got %d", len(levels))
	}

	// Level 1: exact, 10km
	if levels[0].radiusKm != 10 {
		t.Errorf("level 1: expected radiusKm=10, got %d", levels[0].radiusKm)
	}
	if len(levels[0].specialties) != 1 || levels[0].specialties[0] != "orthopedics" {
		t.Errorf("level 1: expected [orthopedics], got %v", levels[0].specialties)
	}

	// Level 2: exact + nearby, 10km
	if levels[1].radiusKm != 10 {
		t.Errorf("level 2: expected radiusKm=10, got %d", levels[1].radiusKm)
	}
	if levels[1].specialties[0] != "orthopedics" {
		t.Errorf("level 2: expected first specialty orthopedics, got %v", levels[1].specialties)
	}
	if len(levels[1].specialties) <= 1 {
		t.Errorf("level 2: expected more than 1 specialty, got %d", len(levels[1].specialties))
	}

	// Level 3: exact, 25km
	if levels[2].radiusKm != 25 {
		t.Errorf("level 3: expected radiusKm=25, got %d", levels[2].radiusKm)
	}
	if len(levels[2].specialties) != 1 || levels[2].specialties[0] != "orthopedics" {
		t.Errorf("level 3: expected [orthopedics], got %v", levels[2].specialties)
	}

	// Level 4: exact + nearby, no location filter
	if levels[3].radiusKm != 0 {
		t.Errorf("level 4: expected radiusKm=0, got %d", levels[3].radiusKm)
	}
}

// TestFetchWithLocation_returnsLevel1WhenSufficient verifies the cascade
// stops at level 1 when it has >= maxRecommendations results.
func TestFetchWithLocation_returnsLevel1WhenSufficient(t *testing.T) {
	// Level 1: orthopedics at 10km → 1 result in default bundles
	// Level 2: orthopedics,general-practice at 10km → more results
	// We need to set up so level 1 has >=5 results.
	pracIDs := []string{"p1", "p2", "p3", "p4", "p5"}
	level1Bundle := multiRoleSearchset("orthopedics", "Orthopedics", pracIDs)

	bundles := map[string]map[string]any{
		"orthopedics": level1Bundle,
	}

	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecommendationService(t, b)

	// Mock the cascade to only use level1 URL matching
	recs, err := svc.FetchWithLocation(context.Background(), FetchParams{
		Specialty:  "orthopedics",
		Latitude:   lat(-6.19),
		Longitude:  lat(106.8),
	})
	if err != nil {
		t.Fatalf("FetchWithLocation returned error: %v", err)
	}

	if len(recs) != 5 {
		t.Fatalf("expected 5 recommendations from level 1, got %d", len(recs))
	}
}

// TestFetchWithLocation_cascadesWhenLevel1Insufficient verifies the cascade
// moves to level 2 when level 1 has < maxRecommendations results.
func TestFetchWithLocation_cascadesWhenLevel1Insufficient(t *testing.T) {
	// Level 1: orthopedics at 10km → only 1 result
	// Level 2: orthopedics,general-practice at 10km → 3 results (1 + 2)
	// Level 3: orthopedics at 25km → 1 result
	// Level 4: orthopedics,general-practice no filter → 3 results
	// We want level 2 to succeed with >=5 by adding more specialties
	level1Bundle := roleSearchset("orthopedics", "Orthopedics", "prc-10", "role-10", "loc-10", "hs-10", "sch-10", 60000)
	level2Bundle := multiRoleSearchset("general-practice", "General Practice", []string{"p1", "p2", "p3", "p4"})

	bundles := map[string]map[string]any{
		"orthopedics":      level1Bundle,
		"general-practice": level2Bundle,
	}

	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecommendationService(t, b)

	recs, err := svc.FetchWithLocation(context.Background(), FetchParams{
		Specialty:  "orthopedics",
		Latitude:   lat(-6.19),
		Longitude:  lat(106.8),
	})
	if err != nil {
		t.Fatalf("FetchWithLocation returned error: %v", err)
	}

	// Should get results from both orthopedics and general-practice
	if len(recs) < 2 {
		t.Errorf("expected at least 2 recommendations after cascade, got %d", len(recs))
	}
}

// TestFetchWithLocation_fallbackToNoFilter verifies the cascade falls back
// to no location filter when all location-filtered levels have < 5 results.
func TestFetchWithLocation_fallbackToNoFilter(t *testing.T) {
	// Only 1 orthopedics practitioner, no nearby specialties with location
	level1Bundle := roleSearchset("orthopedics", "Orthopedics", "prc-10", "role-10", "loc-10", "hs-10", "sch-10", 60000)

	bundles := map[string]map[string]any{
		"orthopedics": level1Bundle,
	}

	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecommendationService(t, b)

	recs, err := svc.FetchWithLocation(context.Background(), FetchParams{
		Specialty:  "orthopedics",
		Latitude:   lat(-6.19),
		Longitude:  lat(106.8),
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
	bundles := defaultBundles()
	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecommendationService(t, b)

	// FetchWithLocation with no coords should use legacy path
	recs, err := svc.FetchWithLocation(context.Background(), FetchParams{
		Specialty: "psychology",
	})
	if err != nil {
		t.Fatalf("FetchWithLocation returned error: %v", err)
	}

	// Legacy path returns 5 (exact + related fill)
	if len(recs) != 5 {
		t.Errorf("expected 5 recommendations from legacy path, got %d", len(recs))
	}
}

// TestFetchWithLocation_singleBatchRequest verifies the cascade uses a single
// FHIR batch request (not 4 sequential requests).
func TestFetchWithLocation_singleBatchRequest(t *testing.T) {
	bundles := map[string]map[string]any{
		"orthopedics":      multiRoleSearchset("orthopedics", "Orthopedics", []string{"p1", "p2", "p3", "p4", "p5"}),
		"general-practice": multiRoleSearchset("general-practice", "General Practice", []string{"p6", "p7"}),
	}

	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecommendationService(t, b)

	_, err := svc.FetchWithLocation(context.Background(), FetchParams{
		Specialty:  "orthopedics",
		Latitude:   lat(-6.19),
		Longitude:  lat(106.8),
	})
	if err != nil {
		t.Fatalf("FetchWithLocation returned error: %v", err)
	}

	// Should be exactly 1 batch request
	if b.hits != 1 {
		t.Errorf("expected exactly 1 FHIR batch request, got %d", b.hits)
	}
}
