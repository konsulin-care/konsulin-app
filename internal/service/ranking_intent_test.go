package service

import "testing"

// rankRec builds a recommendation card for relevance-ranking tests.
func rankRec(id, source, start string, fee int, distance *float64, codes []string) Recommendation {
	var s *TimeSlot
	if start != "" {
		s = &TimeSlot{Start: start, End: start}
	}
	return Recommendation{
		PractitionerRoleID: id,
		Fee:                fee,
		NextSlot:           s,
		DistanceKm:         distance,
		MatchSource:        source,
		serviceTypeCodes:   codes,
	}
}

// TestRankRecommendations_intentMatchFirst pins that a service whose type
// matches the requested serviceTypeCode ranks first even when another service
// has an earlier slot and a lower fee.
func TestRankRecommendations_intentMatchFirst(t *testing.T) {
	noIntent := rankRec("med", "exact", "2026-08-24T02:00:00Z", 350000, nil, []string{"medication-management"})
	intent := rankRec("burnout", "exact", "2026-08-25T02:00:00Z", 400000, nil, []string{"burnout-care"})

	ranked := RankRecommendations([]Recommendation{noIntent, intent}, "burnout-care")
	if ranked[0].PractitionerRoleID != "burnout" {
		t.Errorf("expected intent-matching service first, got %s", ranked[0].PractitionerRoleID)
	}
}

// TestRankRecommendations_sourceOrder pins exact > related > fallback within
// the same intent tier, regardless of slot or fee.
func TestRankRecommendations_sourceOrder(t *testing.T) {
	related := rankRec("rel", "related", "2026-08-24T02:00:00Z", 300000, nil, []string{"burnout-care"})
	fallback := rankRec("fb", "fallback", "2026-08-24T01:00:00Z", 200000, nil, []string{"burnout-care"})
	exact := rankRec("exact", "exact", "2026-08-25T02:00:00Z", 400000, nil, []string{"burnout-care"})

	ranked := RankRecommendations([]Recommendation{related, fallback, exact}, "burnout-care")
	got := []string{ranked[0].PractitionerRoleID, ranked[1].PractitionerRoleID, ranked[2].PractitionerRoleID}
	want := []string{"exact", "rel", "fb"}
	assertStringSlice(t, got, want)
}

// TestRankRecommendations_noIntentPreservesSlotFee pins legacy behavior when no
// serviceTypeCode is provided: slot-first ordering with fee as tie-break.
func TestRankRecommendations_noIntentPreservesSlotFee(t *testing.T) {
	late := rankRec("late", "exact", "2026-08-24T02:00:00Z", 400000, nil, []string{"medication-management"})
	early := rankRec("early", "exact", "2026-08-23T02:00:00Z", 300000, nil, []string{"medication-management"})
	ranked := RankRecommendations([]Recommendation{late, early}, "")
	if ranked[0].PractitionerRoleID != "early" {
		t.Errorf("expected soonest slot first without intent, got %s", ranked[0].PractitionerRoleID)
	}

	cheap := rankRec("cheap", "exact", "2026-08-23T04:00:00Z", 300000, nil, []string{"medication-management"})
	pricey := rankRec("pricey", "exact", "2026-08-23T04:00:00Z", 500000, nil, []string{"medication-management"})
	tied := RankRecommendations([]Recommendation{pricey, cheap}, "")
	if tied[0].PractitionerRoleID != "cheap" {
		t.Errorf("expected cheaper fee to break the slot tie, got %s", tied[0].PractitionerRoleID)
	}
}

// TestRankRecommendations_deterministic pins that identical inputs always rank
// to the same order regardless of input permutation.
func TestRankRecommendations_deterministic(t *testing.T) {
	recs := []Recommendation{
		rankRec("a", "exact", "2026-08-24T02:00:00Z", 300000, nil, []string{"burnout-care"}),
		rankRec("b", "exact", "2026-08-24T02:00:00Z", 300000, nil, []string{"burnout-care"}),
		rankRec("c", "related", "2026-08-23T02:00:00Z", 200000, nil, []string{"burnout-care"}),
	}
	for i := 0; i < 3; i++ {
		first := RankRecommendations(recs, "burnout-care")
		second := RankRecommendations(recs, "burnout-care")
		for j := range first {
			if first[j].PractitionerRoleID != second[j].PractitionerRoleID {
				t.Fatalf("run %d card %d differs: %s vs %s",
					i, j, first[j].PractitionerRoleID, second[j].PractitionerRoleID)
			}
		}
	}
}

// TestRankRecommendations_preservesInput verifies the input slice is not
// reordered in place.
func TestRankRecommendations_preservesInput(t *testing.T) {
	recs := []Recommendation{
		rankRec("a", "related", "2026-08-24T02:00:00Z", 300000, nil, []string{"burnout-care"}),
		rankRec("b", "exact", "2026-08-23T02:00:00Z", 400000, nil, []string{"burnout-care"}),
	}
	original := make([]Recommendation, len(recs))
	copy(original, recs)
	_ = RankRecommendations(recs, "burnout-care")
	for i := range recs {
		if recs[i].PractitionerRoleID != original[i].PractitionerRoleID {
			t.Errorf("input modified at index %d", i)
		}
	}
}
