package service

import (
	"math/rand"
	"sort"
)

// RankRecommendations orders recommendation cards by relevance first:
// service type matching the requested serviceTypeCode, then matchSource
// (exact before related before fallback), then nearest availability,
// then distance, then fee, then role ID as a deterministic tie-break.
// The input slice is not modified.
func RankRecommendations(recs []Recommendation, serviceTypeCode string) []Recommendation {
	out := make([]Recommendation, len(recs))
	copy(out, recs)
	sort.SliceStable(out, func(i, j int) bool {
		return relevanceLess(out[i], out[j], serviceTypeCode)
	})
	return out
}

// relevanceLess reports whether recommendation a ranks before b under the
// relevance-first ordering.
func relevanceLess(a, b Recommendation, serviceTypeCode string) bool {
	aIntent := candidateMatchesIntent(a, serviceTypeCode, "")
	bIntent := candidateMatchesIntent(b, serviceTypeCode, "")
	if aIntent != bIntent {
		return aIntent
	}
	if cmp := compareSource(a.MatchSource, b.MatchSource); cmp != 0 {
		return cmp < 0
	}
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

// compareSource orders matchSource: exact before related before fallback;
// unknown sources rank last.
func compareSource(a, b string) int {
	return sourceRank(a) - sourceRank(b)
}

// sourceRank maps a matchSource label to its relevance tier.
func sourceRank(s string) int {
	switch s {
	case "exact":
		return 0
	case "related":
		return 1
	case "fallback":
		return 2
	default:
		return 3
	}
}

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
// recommendations. When > limit, sorts by slot (soonest NextSlot first,
// nil slots last) and takes the top limit. Returns all input when ≤ limit.
// Distance ordering is handled by FHIR _sort=-_lastUpdated.
func NarrowRecommendations(recs []Recommendation, limit int) []Recommendation {
	if len(recs) <= limit {
		return recs
	}

	return sortBySlot(recs[:limit])
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
