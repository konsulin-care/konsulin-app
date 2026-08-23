package service

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
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

// fallbackFillStub builds a FHIR backend stub for fallback-fill tests: one
// exact psychiatry role, four generic roles for the any-active fallback
// query, and empty searchsets elsewhere. It exposes HTTP hit count and each
// batch's entry count.
func fallbackFillStub() (*httptest.Server, *int, *[]int) {
	hits := 0
	var entryCounts []int
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits++
		w.Header().Set("Content-Type", "application/fhir+json")
		var req struct {
			Entry []struct {
				Request struct {
					URL string `json:"url"`
				} `json:"request"`
			} `json:"entry"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		entryCounts = append(entryCounts, len(req.Entry))
		entries := make([]map[string]any, 0, len(req.Entry))
		for _, e := range req.Entry {
			u, _ := url.Parse(e.Request.URL)
			switch spec := u.Query().Get("specialty"); spec {
			case "2084P0800X":
				entries = append(entries, map[string]any{
					"resource": roleSearchset("2084P0800X", "Psychiatry Physician", "prc-02", "role-2", "loc-B", "hs-2", "sch-2", 70000),
					"response": map[string]any{"status": "200"},
				})
			case "": // any-active-role fallback query
				entries = append(entries, map[string]any{
					"resource": multiRoleSearchset("general-practice", "General Practice", []string{"p1", "p2", "p3", "p4"}),
					"response": map[string]any{"status": "200"},
				})
			default:
				entries = append(entries, map[string]any{
					"resource": map[string]any{"resourceType": "Bundle", "type": "searchset", "total": 0, "entry": []any{}},
					"response": map[string]any{"status": "200"},
				})
			}
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"resourceType": "Bundle", "type": "batch-response", "entry": entries,
		})
	}))
	return srv, &hits, &entryCounts
}

// TestRecommendationService_Fetch_fallbackFillsToFive verifies a sparse
// exact+related pool is topped up to five cards by one extra batch POST that
// searches any active practitioner. Fallback cards rank last and the FHIR
// budget stays at two HTTP requests with every batch <= 10 entries.
func TestRecommendationService_Fetch_fallbackFillsToFive(t *testing.T) {
	backend, hits, entryCounts := fallbackFillStub()
	t.Cleanup(backend.Close)
	svc := NewRecommendationService(RecommendationOptions{BackendBaseURL: backend.URL, Client: backend.Client()})

	recs, err := svc.Fetch(context.Background(), FetchParams{
		Specialty:      "2084P0800X",
		ServiceTypeCode: "burnout-care",
	})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	if len(recs) != 5 {
		t.Fatalf("expected exactly 5 cards (1 exact + 4 fallback), got %d", len(recs))
	}
	if recs[0].MatchSource != "exact" {
		t.Errorf("expected exact card first, got %q", recs[0].MatchSource)
	}
	for _, r := range recs[1:] {
		if r.MatchSource != "fallback" {
			t.Errorf("expected fallback cards last, got %q", r.MatchSource)
		}
	}
	if *hits != 2 {
		t.Errorf("expected 2 FHIR batch POSTs (specialties + fallback), got %d", *hits)
	}
	for i, n := range *entryCounts {
		if n > 10 {
			t.Errorf("batch %d exceeds 10 entries: %d", i, n)
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

// TestRecommendationService_Fetch_widenedBatchStaysOnePost verifies the
// widened nearby expansion stays inside a single FHIR batch POST whose entry
// count never exceeds the documented Blaze ceiling of ten. The exact bundle
// already yields five cards so the conditional fallback fill does not fire.
func TestRecommendationService_Fetch_widenedBatchStaysOnePost(t *testing.T) {
	neighbors := specialty.LoadIndex().NearbyNuccCodes("2084P0800X", relatedSpecialtyLimit, relatedSpecialtyThreshold)
	if len(neighbors) < 2 {
		t.Fatal("expected proximity neighbors for psychiatry")
	}

	// Record every batch request's entry count and total HTTP hits.
	var batches []int
	hits := 0
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits++
		w.Header().Set("Content-Type", "application/fhir+json")
		var req struct {
			Entry []struct {
				Request struct {
					URL string `json:"url"`
				} `json:"request"`
			} `json:"entry"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		batches = append(batches, len(req.Entry))
		entries := make([]map[string]any, 0, len(req.Entry))
		for _, e := range req.Entry {
			u, _ := url.Parse(e.Request.URL)
			spec := u.Query().Get("specialty")
			var bundle map[string]any
			if spec == "2084P0800X" {
				bundle = multiRoleSearchset("2084P0800X", "Psychiatry Physician", []string{"p1", "p2", "p3", "p4", "p5"})
			} else {
				bundle = map[string]any{"resourceType": "Bundle", "type": "searchset", "total": 0, "entry": []any{}}
			}
			entries = append(entries, map[string]any{
				"resource": bundle,
				"response": map[string]any{"status": "200"},
			})
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"resourceType": "Bundle", "type": "batch-response", "entry": entries,
		})
	}))
	t.Cleanup(backend.Close)
	svc := NewRecommendationService(RecommendationOptions{BackendBaseURL: backend.URL, Client: backend.Client()})

	recs, err := svc.Fetch(context.Background(), FetchParams{Specialty: "2084P0800X"})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	if len(recs) != 5 {
		t.Fatalf("expected 5 exact cards, got %d", len(recs))
	}
	if hits != 1 {
		t.Errorf("expected 1 FHIR batch POST per load, got %d", hits)
	}
	if len(batches) != 1 {
		t.Fatalf("expected one batch, got %d", len(batches))
	}
	if batches[0] > 10 {
		t.Errorf("expected batch <= 10 entries, got %d", batches[0])
	}
}