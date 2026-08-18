package service

import (
	"math/rand"
	"sort"
)

// RankByNextSlotDistanceFee orders recommendations by nearest availability
// (earliest NextSlot first, no slot last), then distance (present before
// absent), then fee ascending.
func RankByNextSlotDistanceFee(recs []Recommendation) []Recommendation {
	out := make([]Recommendation, len(recs))
	copy(out, recs)
	sort.SliceStable(out, func(i, j int) bool {
		return rankLess(out[i], out[j])
	})
	return out
}

// rankLess reports whether recommendation a ranks before b.
func rankLess(a, b Recommendation) bool {
	if cmp := compareSlot(a.NextSlot, b.NextSlot); cmp != 0 {
		return cmp < 0
	}
	if cmp := compareDistance(a.DistanceKm, b.DistanceKm); cmp != 0 {
		return cmp < 0
	}
	if a.Fee != b.Fee {
		return a.Fee < b.Fee
	}
	return a.PractitionerRoleID < b.PractitionerRoleID
}

// compareSlot orders slots by start; nil (no slot) ranks last.
func compareSlot(a, b *TimeSlot) int {
	if a == nil && b == nil {
		return 0
	}
	if a == nil {
		return 1
	}
	if b == nil {
		return -1
	}
	if a.Start < b.Start {
		return -1
	}
	if a.Start > b.Start {
		return 1
	}
	return 0
}

// compareDistance orders by km; nil (unknown) ranks last.
func compareDistance(a, b *float64) int {
	if a == nil && b == nil {
		return 0
	}
	if a == nil {
		return 1
	}
	if b == nil {
		return -1
	}
	if *a < *b {
		return -1
	}
	if *a > *b {
		return 1
	}
	return 0
}

// SampleRandom draws up to n distinct recommendations using the given rng.
// Returns the input unchanged when it already fits the size limit.
func SampleRandom(recs []Recommendation, n int, rng *rand.Rand) []Recommendation {
	if len(recs) <= n {
		return recs
	}
	idx := rng.Perm(len(recs))[:n]
	out := make([]Recommendation, 0, n)
	for _, i := range idx {
		out = append(out, recs[i])
	}
	return out
}

// NarrowRecommendations applies cascading filters to produce ≤limit
// recommendations. Stages: distance (closest first), then slot
// (soonest NextSlot first). Returns all input when ≤ limit.
func NarrowRecommendations(recs []Recommendation, limit int) []Recommendation {
	if len(recs) <= limit {
		return recs
	}

	// Stage 1: Distance filter — closest first.
	candidates := sortByDistance(recs)

	// Stage 2: Slot filter if still > limit — soonest first.
	if len(candidates) > limit {
		candidates = sortBySlot(candidates[:limit])
	}

	return candidates
}

// sortByDistance returns a copy sorted by DistanceKm ascending (nil last).
func sortByDistance(recs []Recommendation) []Recommendation {
	out := make([]Recommendation, len(recs))
	copy(out, recs)
	sort.SliceStable(out, func(i, j int) bool {
		return compareDistance(out[i].DistanceKm, out[j].DistanceKm) < 0
	})
	return out
}

// sortBySlot returns a copy sorted by NextSlot ascending (nil last).
func sortBySlot(recs []Recommendation) []Recommendation {
	out := make([]Recommendation, len(recs))
	copy(out, recs)
	sort.SliceStable(out, func(i, j int) bool {
		return compareSlot(out[i].NextSlot, out[j].NextSlot) < 0
	})
	return out
}