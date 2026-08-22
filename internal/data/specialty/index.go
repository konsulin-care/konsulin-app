package specialty

import "github.com/konsulin-care/konsulin-app/internal/data/specialty/proximity"

// SpecialtyIndex provides O(1) lookup for specialty data.
type SpecialtyIndex struct {
	// ByNuccCode maps NUCC code to SpecialtyNode.
	ByNuccCode map[string]*SpecialtyNode

	// ByKeyword maps keyword to list of NUCC codes.
	ByKeyword map[string][]string

	// Proximity stores pre-computed proximity scores.
	Proximity proximity.Table
}

// LookupByNuccCode returns the SpecialtyNode for the given NUCC code.
// Returns nil if not found.
func (idx *SpecialtyIndex) LookupByNuccCode(code string) *SpecialtyNode {
	return idx.ByNuccCode[code]
}

// LookupByKeyword returns NUCC codes matching the given keyword.
// Returns empty slice if not found.
func (idx *SpecialtyIndex) LookupByKeyword(keyword string) []string {
	return idx.ByKeyword[keyword]
}

// GetProximity returns the proximity score between two specialties.
// Returns 0 if not found. Proximity is symmetric.
func (idx *SpecialtyIndex) GetProximity(specA, specB string) float64 {
	if specA == specB {
		return 1.0
	}
	if row, ok := proximity.Generated[specA]; ok {
		if score, ok := row[specB]; ok {
			return score
		}
	}
	return 0
}
