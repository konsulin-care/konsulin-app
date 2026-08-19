package service

import (
	"context"
	"testing"
)

// TestRecommendationService_Fetch_joinsAcrossResourceTypes verifies the exact
// specialty card joins all resources and that nearby-specialty related cards
// fill the list to five, exact first.
//
//nolint:gocognit
func TestRecommendationService_Fetch_joinsAcrossResourceTypes(t *testing.T) {
	b := newRecBackend(t, defaultBundles(), nil, nil)
	recs, err := newRecommendationService(t, b).Fetch(context.Background(), FetchParams{Specialty: "psychology"})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	assertJoinedCards(t, recs)
}

func assertJoinedCards(t *testing.T, recs []Recommendation) {
	t.Helper()
	if len(recs) != 5 {
		t.Fatalf("expected 5 recommendations, got %d", len(recs))
	}
	want := []string{"prc-01", "prc-05", "prc-10", "prc-02", "prc-04"}
	for i, id := range want {
		if recs[i].PractitionerID != id {
			t.Errorf("card %d: expected %s, got %s", i, id, recs[i].PractitionerID)
		}
	}
	card := recs[0]
	if card.PractitionerName != "dr. Rara Kusuma" || card.ScheduleID != "sch-1" || card.HealthcareServiceID != "hs-1" {
		t.Errorf("exact card resource join incorrect: %+v", card)
	}
	if card.Fee != 350000 || card.Currency != "IDR" || card.DurationMinutes != 30 {
		t.Errorf("exact card billing incorrect: %+v", card)
	}
	if card.LocationID != "loc-A" || len(card.Specialties) != 1 || len(card.AvailableTime) != 1 {
		t.Errorf("exact card location/specialty data incorrect: %+v", card)
	}
	if card.MatchSource != "exact" || card.NextSlot != nil || card.DistanceKm != nil {
		t.Errorf("exact card metadata incorrect: %+v", card)
	}
}

// TestRecommendationService_Fetch_oneRequestPerFetch verifies the whole fill
// uses a single FHIR batch POST.
func TestRecommendationService_Fetch_oneRequestPerFetch(t *testing.T) {
	b := newRecBackend(t, defaultBundles(), nil, nil)
	svc := newRecommendationService(t, b)

	if _, err := svc.Fetch(context.Background(), FetchParams{Specialty: "psychology"}); err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	if b.hits != 1 {
		t.Errorf("expected exactly 1 FHIR request per Fetch, got %d", b.hits)
	}
}

// TestRecommendationService_Fetch_dedupsByPractitioner ensures no practitioner
// is repeated across exact and related cards.
func TestRecommendationService_Fetch_dedupsByPractitioner(t *testing.T) {
	b := newRecBackend(t, defaultBundles(), nil, nil)
	svc := newRecommendationService(t, b)

	recs, err := svc.Fetch(context.Background(), FetchParams{Specialty: "psychology"})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	seen := map[string]bool{}
	for _, r := range recs {
		if seen[r.PractitionerID] {
			t.Errorf("practitioner %s appears more than once", r.PractitionerID)
		}
		seen[r.PractitionerID] = true
	}
}

// TestRecommendationService_Fetch_proximityFiltersAndExtractsDistance verifies
// the near filter drops any card whose location is outside the batch near set.
func TestRecommendationService_Fetch_proximityFiltersAndExtractsDistance(t *testing.T) {
	// loc-D (neuropsychology) is deliberately missing from the near set.
	near := []map[string]any{
		nearEntry("loc-A", "Klinik Senen", 5000),
		nearEntry("loc-E", "Klinik E", 3000),
		nearEntry("loc-10", "Klinik 10", 1000),
		nearEntry("loc-B", "Klinik B", 2000),
	}
	b := newRecBackend(t, defaultBundles(), near, nil)
	svc := newRecommendationService(t, b)

	recs, err := svc.Fetch(context.Background(), FetchParams{
		Specialty: "psychology",
		Latitude:  lat(-6.2),
		Longitude: lat(106.8),
	})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	if len(recs) != 4 {
		t.Fatalf("expected 4 cards after proximity drop of prc-04, got %d", len(recs))
	}
	for _, r := range recs {
		if r.DistanceKm == nil {
			t.Errorf("expected distanceKm set for %s", r.PractitionerID)
		}
		if r.PractitionerID == "prc-04" {
			t.Errorf("expected prc-04 dropped outside radius, but it remains")
		}
	}
}
