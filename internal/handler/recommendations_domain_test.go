package handler

import (
	"net/http"
	"testing"
)

// TestRecommendationsHandler_derivesSpecialtyFromDomain verifies icfDomain
// alone is accepted: the handler derives the domain generalist and echoes it.
func TestRecommendationsHandler_derivesSpecialtyFromDomain(t *testing.T) {
	code, body := getRecommendations(t, recHandler(t, false),
		"/api/recommendations?icfDomain=mental-emotional-health")
	if code != http.StatusOK {
		t.Fatalf("expected 200 with icfDomain only, got %d", code)
	}
	if body["specialty"] != "103T00000X" {
		t.Errorf("expected derived specialty 103T00000X, got %v", body["specialty"])
	}
	recs, ok := body["recommendations"].([]any)
	if !ok {
		t.Fatalf("expected recommendations array, got %v", body["recommendations"])
	}
	if len(recs) > 4 {
		t.Errorf("expected at most 4 cards, got %d", len(recs))
	}
}
