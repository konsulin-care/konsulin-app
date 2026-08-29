package service

import (
	"testing"
)

// TestNarrowRecommendations_slotOnlySorting verifies NarrowRecommendations
// now sorts by slot only (FHIR handles distance ordering via _sort=-_lastUpdated).
func TestNarrowRecommendations_slotOnlySorting(t *testing.T) {
	recs := []Recommendation{
		narrowRec("noslot1", km(5.0), ""),
		narrowRec("a", km(5.0), "2026-06-08T12:00:00Z"),
		narrowRec("b", km(5.0), "2026-06-08T10:00:00Z"),
		narrowRec("noslot2", km(5.0), ""),
		narrowRec("c", km(5.0), "2026-06-08T11:00:00Z"),
		narrowRec("d", km(5.0), "2026-06-08T13:00:00Z"),
		narrowRec("e", km(5.0), "2026-06-08T14:00:00Z"),
	}
	got := NarrowRecommendations(recs, 5)
	if len(got) != 5 {
		t.Fatalf("expected 5, got %d", len(got))
	}
	// Should be sorted by slot: soonest first, nil slots last
	gotOrd := make([]string, len(got))
	for i, r := range got {
		gotOrd[i] = r.PractitionerRoleID
	}
	wantOrd := []string{"b", "c", "a", "noslot1", "noslot2"}
	assertStringSlice(t, gotOrd, wantOrd)
}

// TestNarrowRecommendations_distanceIgnored verifies distance is not used
// for sorting (FHIR handles this via _sort=-_lastUpdated).
func TestNarrowRecommendations_distanceIgnored(t *testing.T) {
	recs := []Recommendation{
		narrowRec("far", km(20.0), "2026-06-08T10:00:00Z"),
		narrowRec("near", km(1.0), "2026-06-08T10:00:00Z"),
		narrowRec("mid", km(5.0), "2026-06-08T10:00:00Z"),
	}
	got := NarrowRecommendations(recs, 5)
	if len(got) != 3 {
		t.Fatalf("expected 3, got %d", len(got))
	}
	// All have same slot time, so order is preserved (input order)
	gotOrd := make([]string, len(got))
	for i, r := range got {
		gotOrd[i] = r.PractitionerRoleID
	}
	wantOrd := []string{"far", "near", "mid"}
	assertStringSlice(t, gotOrd, wantOrd)
}
