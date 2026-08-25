package service

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

// TestRecommendationService_Fetch_capsAtFour verifies the result never exceeds
// four cards even when the exact specialty yields more, and no fill fires.
func TestRecommendationService_Fetch_capsAtFour(t *testing.T) {
	bundles := map[string]map[string]any{
		"2084P0800X": multiRoleSearchset("2084P0800X", "Psychiatry Physician", []string{"p1", "p2", "p3", "p4", "p5", "p6"}),
	}
	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecService(t, b)

	recs, err := svc.Fetch(context.Background(), FetchParams{Specialty: "2084P0800X"})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	if len(recs) != maxRecommendations {
		t.Fatalf("expected exactly %d cards, got %d", maxRecommendations, len(recs))
	}
	if b.hits != 1 {
		t.Errorf("expected 1 FHIR batch POST (no fill), got %d", b.hits)
	}
	for _, r := range recs {
		if r.MatchSource != "exact" {
			t.Errorf("expected all exact when no fill needed, got %q for %s", r.MatchSource, r.PractitionerID)
		}
	}
}

// TestRecommendationService_Fetch_globalDedupAcrossTiers verifies a
// practitioner present in both the exact tier and the ICF-domain pool appears
// once, with the exact-tier card winning.
func TestRecommendationService_Fetch_globalDedupAcrossTiers(t *testing.T) {
	bundles := map[string]map[string]any{
		"2084P0800X": roleSearchset("2084P0800X", "Psychiatry Physician", "prc-02", "role-2", "loc-B", "hs-2", "sch-2", 70000),
		"2084P0802X": multiRoleSearchset("2084P0802X", "Addiction Psychiatry Physician", []string{"prc-02", "prc-05"}),
	}
	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecService(t, b)

	recs, err := svc.Fetch(context.Background(), FetchParams{
		Specialty: "2084P0800X",
		ICFDomain: "mental-emotional-health",
	})
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

// TestRecommendationService_Fetch_burnoutOnlyMentalPool pins the core DoD: a
// burnout (mental-emotional-health) request returns only mental-pool cards,
// never a physical-health role even when present.
func TestRecommendationService_Fetch_burnoutOnlyMentalPool(t *testing.T) {
	// The mock returns roles for the requested specialties only; seed a
	// physical role on a code that must never surface for a mental complaint.
	bundles := map[string]map[string]any{
		"2084P0800X": multiRoleSearchset("2084P0800X", "Psychiatry Physician", []string{"p1", "p2", "p3", "p4"}),
		"207WX0107X": roleSearchset("207WX0107X", "Ophthalmology Physician", "eye-1", "role-eye", "loc-E", "hs-E", "sch-E", 300000),
	}
	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecService(t, b)

	recs, err := svc.Fetch(context.Background(), FetchParams{
		Specialty:       "2084P0800X",
		ServiceTypeCode: "burnout-care",
		ICFDomain:       "mental-emotional-health",
	})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	if len(recs) == 0 || len(recs) > maxRecommendations {
		t.Fatalf("expected 1-%d mental cards, got %d", maxRecommendations, len(recs))
	}
	for _, r := range recs {
		if r.PractitionerID == "eye-1" {
			t.Error("ophthalmology role must not surface for a burnout complaint")
		}
	}
}

// TestRecommendationService_Fetch_skipsFailedPoolEntry verifies a non-200
// pool entry is skipped without failing the whole fetch.
func TestRecommendationService_Fetch_skipsFailedPoolEntry(t *testing.T) {
	poolParam := strings.Join(domainCodes("mental-emotional-health", "2084P0800X"), ",")
	if poolParam == "" {
		t.Fatal("expected a non-empty mental pool")
	}
	bundles := map[string]map[string]any{
		"2084P0800X": roleSearchset("2084P0800X", "Psychiatry Physician", "prc-02", "role-2", "loc-B", "hs-2", "sch-2", 70000),
	}
	b := newRecBackend(t, bundles, nil, map[string]bool{poolParam: true})
	svc := newRecService(t, b)

	recs, err := svc.Fetch(context.Background(), FetchParams{
		Specialty: "2084P0800X",
		ICFDomain: "mental-emotional-health",
	})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	if len(recs) != 1 {
		t.Fatalf("expected the exact card only (failed pool skipped), got %d", len(recs))
	}
	if recs[0].PractitionerID != "prc-02" || recs[0].MatchSource != "exact" {
		t.Errorf("expected prc-02 exact, got %s %q", recs[0].PractitionerID, recs[0].MatchSource)
	}
}

// TestRecommendationService_Fetch_fillStaysInDomain verifies a sparse exact
// result is filled only from the mental domain pool (which contains the
// psychologist generalist; no any-active query exists anymore), stays within
// maxRecommendations, and uses one batch POST.
func TestRecommendationService_Fetch_fillStaysInDomain(t *testing.T) {
	bundles := map[string]map[string]any{
		"2084P0800X": roleSearchset("2084P0800X", "Psychiatry Physician", "prc-02", "role-2", "loc-B", "hs-2", "sch-2", 70000),
		"103T00000X": multiRoleSearchset("103T00000X", "Psychologist", []string{"g1", "g2", "g3", "g4", "g5"}),
	}
	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecService(t, b)

	recs, err := svc.Fetch(context.Background(), FetchParams{
		Specialty: "2084P0800X",
		ICFDomain: "mental-emotional-health",
	})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	if len(recs) != maxRecommendations {
		t.Fatalf("expected %d cards (1 exact + 3 pool), got %d", maxRecommendations, len(recs))
	}
	if recs[0].MatchSource != "exact" {
		t.Errorf("expected exact card first, got %q", recs[0].MatchSource)
	}
	for _, r := range recs[1:] {
		if r.MatchSource != "related" {
			t.Errorf("expected pool cards tagged related (generalist is in the pool), got %q", r.MatchSource)
		}
	}
	if b.hits != 1 {
		t.Errorf("expected 1 FHIR batch POST (all tiers in one batch), got %d", b.hits)
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

// TestRecommendationService_Fetch_allTiersInOnePost verifies the exact + pool
// + generalist tiers travel in a single FHIR batch POST whose entry count
// never exceeds the documented Blaze ceiling of ten.
func TestRecommendationService_Fetch_allTiersInOnePost(t *testing.T) {
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
				bundle = multiRoleSearchset("2084P0800X", "Psychiatry Physician", []string{"p1", "p2", "p3", "p4"})
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

	recs, err := svc.Fetch(context.Background(), FetchParams{
		Specialty: "2084P0800X",
		ICFDomain: "mental-emotional-health",
	})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	if len(recs) != maxRecommendations {
		t.Fatalf("expected %d exact cards, got %d", maxRecommendations, len(recs))
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
