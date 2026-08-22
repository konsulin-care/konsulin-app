package service

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/konsulin-care/konsulin-app/internal/data/specialty"
)

// TestRecommendationService_Fetch_relatedFill_capsAtFive verifies the result
// never exceeds five cards even when the exact specialty yields more.
func TestRecommendationService_Fetch_relatedFill_capsAtFive(t *testing.T) {
	bundles := defaultBundles()
	bundles["2084P0800X"] = multiRoleSearchset("2084P0800X", "Psychiatry Physician", []string{"p1", "p2", "p3", "p4", "p5", "p6"})
	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecommendationService(t, b)

	recs, err := svc.Fetch(context.Background(), FetchParams{Specialty: "2084P0800X"})
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
// practitioner present in both the exact and a proximity-adjacent specialty
// appears once.
func TestRecommendationService_Fetch_globalDedupAcrossSpecialties(t *testing.T) {
	bundles := map[string]map[string]any{
		"2084P0800X": roleSearchset("2084P0800X", "Psychiatry Physician", "prc-02", "role-2", "loc-B", "hs-2", "sch-2", 70000),
		"2084P0802X": multiRoleSearchset("2084P0802X", "Addiction Psychiatry Physician", []string{"prc-02", "prc-05"}),
	}
	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecommendationService(t, b)

	recs, err := svc.Fetch(context.Background(), FetchParams{Specialty: "2084P0800X"})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	if len(recs) != 2 {
		t.Fatalf("expected 2 cards (prc-02 exact + prc-05 related), got %d", len(recs))
	}
	if recs[0].PractitionerID != "prc-02" || recs[0].MatchSource != "exact" {
		t.Errorf("expected prc-02 exact first, got %s %q", recs[0].PractitionerID, recs[0].MatchSource)
	}
	if recs[1].PractitionerID != "prc-05" || recs[1].MatchSource != "related" {
		t.Errorf("expected prc-05 related second, got %s %q", recs[1].PractitionerID, recs[1].MatchSource)
	}
}

// TestRecommendationService_Fetch_skipsFailedNearbyEntry verifies a non-200
// nearby entry is skipped without failing the whole fetch.
func TestRecommendationService_Fetch_skipsFailedNearbyEntry(t *testing.T) {
	// Exact psychiatry (1 role) + two healthy proximity neighbors; one
	// neighbor is made to fail to prove non-200 entries are skipped.
	neighbors := specialty.LoadIndex().NearbyNuccCodes("2084P0800X", relatedSpecialtyLimit, relatedSpecialtyThreshold)
	if len(neighbors) < 2 {
		t.Fatal("expected >=2 proximity neighbors for psychiatry")
	}
	bundles := map[string]map[string]any{
		"2084P0800X": roleSearchset("2084P0800X", "Psychiatry Physician", "prc-02", "role-2", "loc-B", "hs-2", "sch-2", 70000),
		neighbors[0]:  multiRoleSearchset(neighbors[0], "Psychiatry specialization", []string{"p1", "p2"}),
		neighbors[1]:  multiRoleSearchset(neighbors[1], "Psychiatry specialization", []string{"p3", "p4"}),
	}
	b := newRecBackend(t, bundles, nil, map[string]bool{neighbors[0]: true})
	svc := newRecommendationService(t, b)

	recs, err := svc.Fetch(context.Background(), FetchParams{Specialty: "2084P0800X"})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	if len(recs) != 3 {
		t.Fatalf("expected 3 cards with the failing neighbor skipped, got %d", len(recs))
	}
	for _, r := range recs {
		if r.PractitionerID == "p1" || r.PractitionerID == "p2" {
			t.Errorf("expected failing neighbor practitioners skipped, got %s", r.PractitionerID)
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
	if _, err := svc.Fetch(context.Background(), FetchParams{Specialty: "2084P0800X"}); err == nil {
		t.Fatal("expected error when backend returns 500")
	}
}