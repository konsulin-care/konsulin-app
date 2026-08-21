package service

import (
	"math/rand"
	"testing"
)

func slotRec(id string, start, end string, fee int, distance *float64) Recommendation {
	var s *TimeSlot
	if start != "" {
		s = &TimeSlot{Start: start, End: end}
	}
	return Recommendation{
		PractitionerRoleID: "PractitionerRole/" + id,
		PractitionerID:     "Practitioner/" + id,
		Fee:                fee,
		NextSlot:           s,
		DistanceKm:         distance,
	}
}

func TestRankByNextSlotDistanceFee_slotBeforeNoSlot(t *testing.T) {
	noSlot := slotRec("no", "", "", 100, nil)
	late := slotRec("late", "2026-06-09T02:00:00Z", "2026-06-09T03:00:00Z", 100, nil)
	early := slotRec("early", "2026-06-08T02:00:00Z", "2026-06-08T03:00:00Z", 100, nil)

	ranked := RankByNextSlotDistanceFee([]Recommendation{noSlot, late, early})
	got := []string{ranked[0].PractitionerRoleID, ranked[1].PractitionerRoleID, ranked[2].PractitionerRoleID}
	want := []string{"PractitionerRole/early", "PractitionerRole/late", "PractitionerRole/no"}
	assertStringSlice(t, got, want)
}

func TestRankByNextSlotDistanceFee_distanceBreaksTies(t *testing.T) {
	far := km(20.0)
	near := km(2.0)
	a := slotRec("far", "2026-06-08T02:00:00Z", "2026-06-08T03:00:00Z", 100, far)
	b := slotRec("near", "2026-06-08T02:00:00Z", "2026-06-08T03:00:00Z", 100, near)

	ranked := RankByNextSlotDistanceFee([]Recommendation{a, b})
	if ranked[0].PractitionerRoleID != "PractitionerRole/near" {
		t.Errorf("expected near first, got %s", ranked[0].PractitionerRoleID)
	}
}

func TestRankByNextSlotDistanceFee_feeBreaksDistanceTies(t *testing.T) {
	a := slotRec("expensive", "2026-06-08T02:00:00Z", "2026-06-08T03:00:00Z", 400000, km(5.0))
	b := slotRec("cheap", "2026-06-08T02:00:00Z", "2026-06-08T03:00:00Z", 300000, km(5.0))

	ranked := RankByNextSlotDistanceFee([]Recommendation{a, b})
	if ranked[0].PractitionerRoleID != "PractitionerRole/cheap" {
		t.Errorf("expected cheap first, got %s", ranked[0].PractitionerRoleID)
	}
}

func TestRankByNextSlotDistanceFee_nilDistanceOrdersAfterPresent(t *testing.T) {
	a := slotRec("nodist", "2026-06-08T02:00:00Z", "2026-06-08T03:00:00Z", 100, nil)
	b := slotRec("dist", "2026-06-08T02:00:00Z", "2026-06-08T03:00:00Z", 200, km(5.0))

	ranked := RankByNextSlotDistanceFee([]Recommendation{a, b})
	if ranked[0].PractitionerRoleID != "PractitionerRole/dist" {
		t.Errorf("expected dist first, got %s", ranked[0].PractitionerRoleID)
	}
}

func TestSampleRandom_returnsFiveWhenEnough(t *testing.T) {
	recs := make([]Recommendation, 10)
	for i := range recs {
		recs[i] = slotRec(string(rune('a'+i)), "", "", 0, nil)
	}
	rng := rand.New(rand.NewSource(42))
	sampled := SampleRandom(recs, 5, rng)
	if len(sampled) != 5 {
		t.Fatalf("expected 5 samples, got %d", len(sampled))
	}
	seen := map[string]bool{}
	for _, r := range sampled {
		if seen[r.PractitionerRoleID] {
			t.Errorf("duplicate sample %s", r.PractitionerRoleID)
		}
		seen[r.PractitionerRoleID] = true
	}
}

func TestSampleRandom_returnsAllWhenFewer(t *testing.T) {
	recs := []Recommendation{slotRec("a", "", "", 0, nil), slotRec("b", "", "", 0, nil)}
	rng := rand.New(rand.NewSource(7))
	sampled := SampleRandom(recs, 5, rng)
	if len(sampled) != 2 {
		t.Fatalf("expected all 2 samples, got %d", len(sampled))
	}
}

func km(v float64) *float64 { return &v }

func assertStringSlice(t *testing.T, got, want []string) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("length mismatch: got %v want %v", got, want)
	}
	for i := range got {
		if got[i] != want[i] {
			t.Fatalf("index %d: got %s want %s", i, got[i], want[i])
		}
	}
}

// --- NarrowRecommendations tests ---

func narrowRec(id string, distance *float64, slotStart string) Recommendation {
	var s *TimeSlot
	if slotStart != "" {
		s = &TimeSlot{Start: slotStart, End: slotStart}
	}
	return Recommendation{
		PractitionerRoleID: id,
		Fee:                100000,
		NextSlot:           s,
		DistanceKm:         distance,
	}
}

func TestNarrowRecommendations_returnsAllWhenUnderLimit(t *testing.T) {
	recs := []Recommendation{
		narrowRec("a", km(1.0), "2026-06-08T10:00:00Z"),
		narrowRec("b", km(2.0), "2026-06-08T11:00:00Z"),
		narrowRec("c", km(3.0), "2026-06-08T12:00:00Z"),
	}
	got := NarrowRecommendations(recs, 5)
	if len(got) != 3 {
		t.Fatalf("expected 3, got %d", len(got))
	}
}

func TestNarrowRecommendations_returnsAllWhenExactlyLimit(t *testing.T) {
	recs := make([]Recommendation, 5)
	for i := range recs {
		recs[i] = narrowRec(string(rune('a'+i)), km(float64(i+1)), "2026-06-08T10:00:00Z")
	}
	got := NarrowRecommendations(recs, 5)
	if len(got) != 5 {
		t.Fatalf("expected 5, got %d", len(got))
	}
}

func TestNarrowRecommendations_returnsEmptyForEmptyInput(t *testing.T) {
	got := NarrowRecommendations(nil, 5)
	if len(got) != 0 {
		t.Fatalf("expected 0, got %d", len(got))
	}
}

func TestNarrowRecommendations_selectsClosestByDistance(t *testing.T) {
	recs := []Recommendation{
		narrowRec("far1", km(20.0), "2026-06-08T10:00:00Z"),
		narrowRec("far2", km(15.0), "2026-06-08T10:00:00Z"),
		narrowRec("near1", km(1.0), "2026-06-08T10:00:00Z"),
		narrowRec("near2", km(3.0), "2026-06-08T10:00:00Z"),
		narrowRec("mid", km(8.0), "2026-06-08T10:00:00Z"),
		narrowRec("far3", km(25.0), "2026-06-08T10:00:00Z"),
		narrowRec("far4", km(30.0), "2026-06-08T10:00:00Z"),
	}
	got := NarrowRecommendations(recs, 5)
	if len(got) != 5 {
		t.Fatalf("expected 5, got %d", len(got))
	}
	// Should have near1, near2, mid — the three closest
	ids := make([]string, len(got))
	for i, r := range got {
		ids[i] = r.PractitionerRoleID
	}
	want := []string{"near1", "near2", "mid"}
	for _, w := range want {
		found := false
		for _, id := range ids {
			if id == w {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("expected %s in result, got %v", w, ids)
		}
	}
}

func TestNarrowRecommendations_nilDistanceSortsLast(t *testing.T) {
	recs := []Recommendation{
		narrowRec("nodist1", nil, "2026-06-08T10:00:00Z"),
		narrowRec("far", km(20.0), "2026-06-08T10:00:00Z"),
		narrowRec("near", km(1.0), "2026-06-08T10:00:00Z"),
		narrowRec("nodist2", nil, "2026-06-08T10:00:00Z"),
		narrowRec("mid", km(5.0), "2026-06-08T10:00:00Z"),
		narrowRec("far2", km(10.0), "2026-06-08T10:00:00Z"),
		narrowRec("far3", km(15.0), "2026-06-08T10:00:00Z"),
	}
	got := NarrowRecommendations(recs, 5)
	if len(got) != 5 {
		t.Fatalf("expected 5, got %d", len(got))
	}
	// With slot-only sorting, all have same slot time, so input order is preserved
	// (first 5 from input)
	gotOrd := make([]string, len(got))
	for i, r := range got {
		gotOrd[i] = r.PractitionerRoleID
	}
	wantOrd := []string{"nodist1", "far", "near", "nodist2", "mid"}
	assertStringSlice(t, gotOrd, wantOrd)
}

func TestNarrowRecommendations_slotFiltering(t *testing.T) {
	// Distance can't reduce (all same), so [:5] takes first 5 by input order.
	// Slot sort reorders those 5: nil slots last.
	tests := []struct {
		name    string
		recs    []Recommendation
		wantOrd []string
	}{
		{
			name: "nil slots sort last",
			recs: []Recommendation{
				narrowRec("noslot1", km(5.0), ""),
				narrowRec("a", km(5.0), "2026-06-08T12:00:00Z"),
				narrowRec("b", km(5.0), "2026-06-08T10:00:00Z"),
				narrowRec("noslot2", km(5.0), ""),
				narrowRec("c", km(5.0), "2026-06-08T11:00:00Z"),
				narrowRec("d", km(5.0), "2026-06-08T13:00:00Z"),
				narrowRec("e", km(5.0), "2026-06-08T14:00:00Z"),
			},
			wantOrd: []string{"b", "c", "a", "noslot1", "noslot2"},
		},
		{
			name: "soonest slots first",
			recs: []Recommendation{
				narrowRec("a", km(5.0), "2026-06-08T14:00:00Z"),
				narrowRec("b", km(5.0), "2026-06-08T10:00:00Z"),
				narrowRec("c", km(5.0), "2026-06-08T12:00:00Z"),
				narrowRec("d", km(5.0), "2026-06-08T11:00:00Z"),
				narrowRec("e", km(5.0), "2026-06-08T13:00:00Z"),
				narrowRec("f", km(5.0), "2026-06-08T15:00:00Z"),
				narrowRec("g", km(5.0), "2026-06-08T16:00:00Z"),
			},
			wantOrd: []string{"b", "d", "c", "e", "a"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := NarrowRecommendations(tt.recs, 5)
			if len(got) != 5 {
				t.Fatalf("expected 5, got %d", len(got))
			}
			gotOrd := make([]string, len(got))
			for i, r := range got {
				gotOrd[i] = r.PractitionerRoleID
			}
			assertStringSlice(t, gotOrd, tt.wantOrd)
		})
	}
}

func TestNarrowRecommendations_preservesInput(t *testing.T) {
	recs := []Recommendation{
		narrowRec("a", km(1.0), "2026-06-08T10:00:00Z"),
		narrowRec("b", km(2.0), "2026-06-08T11:00:00Z"),
	}
	original := make([]Recommendation, len(recs))
	copy(original, recs)
	_ = NarrowRecommendations(recs, 5)
	for i := range recs {
		if recs[i].PractitionerRoleID != original[i].PractitionerRoleID {
			t.Errorf("input modified at %d", i)
		}
	}
}
