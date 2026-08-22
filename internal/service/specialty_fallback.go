package service

import "github.com/konsulin-care/konsulin-app/internal/data/specialty"

const (
	// relatedSpecialtyLimit caps the number of proximity-expanded codes used
	// to fill recommendation slots below the exact-match quota.
	relatedSpecialtyLimit = 5
	// relatedSpecialtyThreshold is the minimum ontology proximity for a code
	// to count as a semantically related specialty.
	relatedSpecialtyThreshold = 0.5
)

// nearbySpecialties expands a NUCC code to its semantically close specialty
// codes using the generated ontology proximity table (0.6 clinical + 0.3
// domain + 0.1 structural, normalized). Used to fill recommendation slots
// when the exact-specialty match yields fewer than maxRecommendations cards.
// Unknown or unseeded codes yield an empty list (exact-only).
func nearbySpecialties(specialtyCode string) []string {
	return specialty.LoadIndex().NearbyNuccCodes(
		specialtyCode, relatedSpecialtyLimit, relatedSpecialtyThreshold,
	)
}