package service

import (
	"context"
	"testing"
)

// TestBuildCascadeLevels_threeTiers verifies the location cascade shape for a
// mental complaint: exact near, then pool near + unlimited, then generalist
// near + unlimited.
func TestBuildCascadeLevels_threeTiers(t *testing.T) {
	levels := buildCascadeLevels(FetchParams{
		Specialty: "2084P0800X",
		ICFDomain: "mental-emotional-health",
	})

	if len(levels) != 5 {
		t.Fatalf("expected 5 cascade levels (exact + 2x pool + 2x generalist), got %d", len(levels))
	}
	if levels[0].tier.label != "exact" || levels[0].radiusKm != 10 {
		t.Errorf("level 1: expected exact@10, got %s@%d", levels[0].tier.label, levels[0].radiusKm)
	}
	if levels[0].tier.codes[0] != "2084P0800X" || len(levels[0].tier.codes) != 1 {
		t.Errorf("level 1: expected exact [2084P0800X], got %v", levels[0].tier.codes)
	}
	if levels[1].tier.label != "related" || levels[1].radiusKm != 10 {
		t.Errorf("level 2: expected related@10, got %s@%d", levels[1].tier.label, levels[1].radiusKm)
	}
	if !sliceContains(levels[1].tier.codes, "103T00000X") {
		t.Errorf("level 2: psychology generalist missing from the mental pool (%d codes)", len(levels[1].tier.codes))
	}
	if levels[4].tier.label != "fallback" || levels[4].radiusKm != 0 {
		t.Errorf("level 5: expected fallback@unlimited, got %s@%d", levels[4].tier.label, levels[4].radiusKm)
	}
	if levels[4].tier.codes[0] != "103T00000X" {
		t.Errorf("level 5: expected psychologist generalist, got %v", levels[4].tier.codes)
	}
}

// TestBuildCascadeLevels_noDomain verifies a specialty-only request yields a
// single near level.
func TestBuildCascadeLevels_noDomain(t *testing.T) {
	levels := buildCascadeLevels(FetchParams{Specialty: "207X00000X"})
	if len(levels) != 1 || levels[0].tier.label != "exact" || levels[0].radiusKm != 10 {
		t.Fatalf("expected [exact@10], got %+v", levels)
	}
}

// TestFetchWithLocation_returnsLevel1WhenSufficient verifies the cascade
// stops at level 1 when it has >= maxRecommendations results.
func TestFetchWithLocation_returnsLevel1WhenSufficient(t *testing.T) {
	pracIDs := []string{"p1", "p2", "p3", "p4"}
	bundles := map[string]map[string]any{
		"2084P0800X": multiRoleSearchset("2084P0800X", "Psychiatry Physician", pracIDs),
	}
	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecService(t, b)

	recs, err := svc.FetchWithLocation(context.Background(), FetchParams{
		Specialty: "2084P0800X",
		ICFDomain: "mental-emotional-health",
		Latitude:  lat(-6.19),
		Longitude: lat(106.8),
	})
	if err != nil {
		t.Fatalf("FetchWithLocation returned error: %v", err)
	}
	if len(recs) != maxRecommendations {
		t.Fatalf("expected %d recommendations from level 1, got %d", maxRecommendations, len(recs))
	}
	for _, r := range recs {
		if r.MatchSource != "exact" {
			t.Errorf("expected all-exact level-1 cards, got %q", r.MatchSource)
		}
	}
}

// TestFetchWithLocation_cascadesWhenLevel1Insufficient verifies the cascade
// merges the domain pool when the exact tier has < maxRecommendations results.
func TestFetchWithLocation_cascadesWhenLevel1Insufficient(t *testing.T) {
	bundles := map[string]map[string]any{
		"2084P0800X": roleSearchset("2084P0800X", "Psychiatry Physician", "prc-02", "role-2", "loc-B", "hs-2", "sch-2", 70000),
		"103TC1900X": multiRoleSearchset("103TC1900X", "Counseling Psychologist", []string{"p1", "p2"}),
	}
	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecService(t, b)

	recs, err := svc.FetchWithLocation(context.Background(), FetchParams{
		Specialty: "2084P0800X",
		ICFDomain: "mental-emotional-health",
		Latitude:  lat(-6.19),
		Longitude: lat(106.8),
	})
	if err != nil {
		t.Fatalf("FetchWithLocation returned error: %v", err)
	}
	across := map[string]bool{}
	for _, r := range recs {
		across[r.PractitionerID] = true
		if r.MatchSource != "exact" && r.MatchSource != "related" {
			t.Errorf("expected exact/related only from pool merge, got %q", r.MatchSource)
		}
	}
	if len(across) < 2 {
		t.Errorf("expected >=2 distinct practitioners after cascade, got %d", len(across))
	}
}

// TestFetchWithLocation_poolMergeCoversGeneralist verifies merging the
// cascade levels surfaces only mental-pool practitioners (the psychologist
// generalist is itself in the mental pool, so its cards arrive via the pool
// tier), capped at maxRecommendations with the exact card first.
func TestFetchWithLocation_poolMergeCoversGeneralist(t *testing.T) {
	bundles := map[string]map[string]any{
		"2084P0800X": roleSearchset("2084P0800X", "Psychiatry Physician", "prc-02", "role-2", "loc-B", "hs-2", "sch-2", 70000),
		"103T00000X": multiRoleSearchset("103T00000X", "Psychologist", []string{"g1", "g2", "g3"}),
	}
	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecService(t, b)

	recs, err := svc.FetchWithLocation(context.Background(), FetchParams{
		Specialty: "2084P0800X",
		ICFDomain: "mental-emotional-health",
		Latitude:  lat(-6.19),
		Longitude: lat(106.8),
	})
	if err != nil {
		t.Fatalf("FetchWithLocation returned error: %v", err)
	}
	if len(recs) != maxRecommendations {
		t.Fatalf("expected %d cards, got %d", maxRecommendations, len(recs))
	}
	if recs[0].MatchSource != "exact" {
		t.Errorf("expected exact first, got %q", recs[0].MatchSource)
	}
	mental := domainCodes("mental-emotional-health", "")
	mentalSet := make(map[string]bool, len(mental))
	for _, c := range mental {
		mentalSet[c] = true
	}
	for _, r := range recs {
		for _, s := range r.Specialties {
			if r.MatchSource == "exact" {
				continue // exact tier is the requested psychiatric code
			}
			if s != "Psychologist" {
				t.Errorf("expected a mental-pool card, got specialty %q", s)
			}
		}
	}
}

// sliceContains reports whether items contains s.
func sliceContains(items []string, s string) bool {
	for _, it := range items {
		if it == s {
			return true
		}
	}
	return false
}

// TestFetchWithLocation_usesFetchWhenNoCoords verifies FetchWithLocation
// delegates to Fetch (no location cascade) when lat/lon are absent.
func TestFetchWithLocation_usesFetchWhenNoCoords(t *testing.T) {
	bundles := map[string]map[string]any{
		"103T00000X": psychologySearchset(),
	}
	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecService(t, b)

	recs, err := svc.FetchWithLocation(context.Background(), FetchParams{
		Specialty: "103T00000X",
		ICFDomain: "mental-emotional-health",
	})
	if err != nil {
		t.Fatalf("FetchWithLocation returned error: %v", err)
	}
	if len(recs) != 1 {
		t.Errorf("expected 1 exact card from Fetch, got %d", len(recs))
	}
	if recs[0].MatchSource != "exact" {
		t.Errorf("expected exact source, got %q", recs[0].MatchSource)
	}
}

// TestFetchWithLocation_singleBatchRequest verifies the cascade uses a single
// FHIR batch request and stays within the entry ceiling.
func TestFetchWithLocation_singleBatchRequest(t *testing.T) {
	bundles := map[string]map[string]any{
		"2084P0800X": multiRoleSearchset("2084P0800X", "Psychiatry Physician", []string{"p1", "p2", "p3", "p4"}),
	}
	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecService(t, b)

	_, err := svc.FetchWithLocation(context.Background(), FetchParams{
		Specialty: "2084P0800X",
		ICFDomain: "mental-emotional-health",
		Latitude:  lat(-6.19),
		Longitude: lat(106.8),
	})
	if err != nil {
		t.Fatalf("FetchWithLocation returned error: %v", err)
	}
	if b.hits != 1 {
		t.Errorf("expected exactly 1 FHIR batch request, got %d", b.hits)
	}
}
