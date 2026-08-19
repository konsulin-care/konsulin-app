package service

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestRecommendationService_Fetch_relatedFill_capsAtFive verifies the result
// never exceeds five cards even when the exact specialty yields more.
func TestRecommendationService_Fetch_relatedFill_capsAtFive(t *testing.T) {
	bundles := defaultBundles()
	bundles["psychology"] = multiRoleSearchset("psychology", "Clinical Psychology", []string{"p1", "p2", "p3", "p4", "p5", "p6"})
	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecommendationService(t, b)

	recs, err := svc.Fetch(context.Background(), FetchParams{Specialty: "psychology"})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	if len(recs) != 5 {
		t.Fatalf("expected exactly 5 cards, got %d", len(recs))
	}
	for _, r := range recs {
		if r.MatchSource != "exact" {
			t.Errorf("expected all exact when no related fill needed, got %q for %s", r.MatchSource, r.PractitionerID)
		}
	}
}

// TestRecommendationService_Fetch_globalDedupAcrossSpecialties verifies a
// practitioner present in both the exact and a nearby specialty appears once.
func TestRecommendationService_Fetch_globalDedupAcrossSpecialties(t *testing.T) {
	bundles := map[string]map[string]any{
		"psychology":       psychologySearchset(), // prc-01
		"general-practice": multiRoleSearchset("general-practice", "General Practice", []string{"prc-01", "prc-05"}),
	}
	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecommendationService(t, b)

	recs, err := svc.Fetch(context.Background(), FetchParams{Specialty: "psychology"})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	if len(recs) != 2 {
		t.Fatalf("expected 2 cards (prc-01 exact + prc-05 related), got %d", len(recs))
	}
	if recs[0].PractitionerID != "prc-01" || recs[0].MatchSource != "exact" {
		t.Errorf("expected prc-01 exact first, got %s %q", recs[0].PractitionerID, recs[0].MatchSource)
	}
	if recs[1].PractitionerID != "prc-05" || recs[1].MatchSource != "related" {
		t.Errorf("expected prc-05 related second, got %s %q", recs[1].PractitionerID, recs[1].MatchSource)
	}
}

// TestRecommendationService_Fetch_skipsFailedNearbyEntry verifies a non-200
// nearby entry is skipped without failing the whole fetch.
func TestRecommendationService_Fetch_skipsFailedNearbyEntry(t *testing.T) {
	b := newRecBackend(t, defaultBundles(), nil, map[string]bool{"psychiatry": true})
	svc := newRecommendationService(t, b)

	recs, err := svc.Fetch(context.Background(), FetchParams{Specialty: "psychology"})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	if len(recs) != 4 {
		t.Fatalf("expected 4 cards with psychiatry skipped, got %d", len(recs))
	}
	for _, r := range recs {
		if r.PractitionerID == "prc-02" {
			t.Errorf("expected psychiatric practitioner prc-02 skipped")
		}
	}
}

// TestRecommendationService_Fetch_backendError verifies a 500 from the FHIR
// backend surfaces as an error.
func TestRecommendationService_Fetch_backendError(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"boom"}`))
	}))
	t.Cleanup(backend.Close)

	svc := NewRecommendationService(RecommendationOptions{BackendBaseURL: backend.URL, Client: backend.Client()})
	if _, err := svc.Fetch(context.Background(), FetchParams{Specialty: "psychology"}); err == nil {
		t.Fatal("expected error when backend returns 500")
	}
}
