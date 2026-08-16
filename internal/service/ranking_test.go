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