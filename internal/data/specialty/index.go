package specialty

import (
	_ "embed" // for go:embed index_data.json
	"encoding/json"
	"sort"
	"sync"

	"github.com/konsulin-care/konsulin-app/internal/data/specialty/proximity"
)

//go:embed index_data.json
var indexData []byte

// embeddedNode mirrors the generated direct-index node shape.
type embeddedNode struct {
	NuccCode        string   `json:"nuccCode"`
	IscoCode        string   `json:"iscoCode"`
	Label           string   `json:"label"`
	DomainSignature []string `json:"domainSignature"`
}

// ResolutionData is the persisted complaint -> NUCC resolution.
type ResolutionData struct {
	NuccCode string  `json:"nuccCode"`
	Label    string  `json:"label"`
	Score    float64 `json:"score"`
}

// indexPayload mirrors the generated index_data.json shape.
type indexPayload struct {
	GeneratedAt string                    `json:"generatedAt"`
	Specialties map[string]embeddedNode   `json:"specialties"`
	ByKeyword   map[string][]string       `json:"byKeyword"`
	Resolutions map[string]ResolutionData `json:"resolutions"`
}

// SpecialtyIndex provides O(1) lookup for specialty data.
type SpecialtyIndex struct {
	// ByNuccCode maps NUCC code to SpecialtyNode.
	ByNuccCode map[string]*SpecialtyNode

	// ByKeyword maps keyword to list of NUCC codes.
	ByKeyword map[string][]string

	// Resolutions maps interview complaint ids to canonical NUCC codes.
	Resolutions map[string]ResolutionData

	// Proximity stores pre-computed proximity scores.
	Proximity proximity.Table
}

var (
	loadOnce  sync.Once
	loadedIdx *SpecialtyIndex
)

// LoadIndex returns the singleton specialty index wired from the embedded
// generated data: the direct index, the keyword inverted index, and the
// interview resolution map. The proximity table is populated by the shard
// init functions of the proximity package.
//
// @returns the fully populated specialty index
func LoadIndex() *SpecialtyIndex {
	loadOnce.Do(func() {
		var payload indexPayload
		if err := json.Unmarshal(indexData, &payload); err != nil {
			// Embedded data is generated; a parse failure is a build error.
			loadedIdx = &SpecialtyIndex{Proximity: proximity.Generated}
			return
		}
		direct := make(map[string]*SpecialtyNode, len(payload.Specialties))
		for code, node := range payload.Specialties {
			direct[code] = &SpecialtyNode{
				NuccCode:        node.NuccCode,
				IscoCode:        node.IscoCode,
				Label:           node.Label,
				DomainSignature: node.DomainSignature,
			}
		}
		loadedIdx = &SpecialtyIndex{
			ByNuccCode:  direct,
			ByKeyword:   payload.ByKeyword,
			Resolutions: payload.Resolutions,
			Proximity:   proximity.Generated,
		}
	})
	return loadedIdx
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

// NearbyNuccCodes returns the codes whose proximity to the given code is at
// least the threshold, excluding the query code itself, ordered by score
// descending with a deterministic alphabetical tie-break, capped at maxK.
// A missing or unknown code yields no neighbors.
//
// @param code - the query NUCC code
// @param maxK - maximum number of neighbors to return
// @param threshold - minimum proximity score to include a neighbor
// @returns neighbor codes in descending proximity order
func (idx *SpecialtyIndex) NearbyNuccCodes(code string, maxK int, threshold float64) []string {
	row, ok := proximity.Generated[code]
	if !ok || maxK <= 0 {
		return nil
	}

	type scored struct {
		code  string
		score float64
	}
	candidates := make([]scored, 0, len(row))
	for other, score := range row {
		if other == code || score < threshold {
			continue
		}
		candidates = append(candidates, scored{code: other, score: score})
	}
	if len(candidates) == 0 {
		return nil
	}
	sort.Slice(candidates, func(i, j int) bool {
		if candidates[i].score != candidates[j].score {
			return candidates[i].score > candidates[j].score
		}
		return candidates[i].code < candidates[j].code
	})
	if len(candidates) > maxK {
		candidates = candidates[:maxK]
	}

	out := make([]string, len(candidates))
	for i, c := range candidates {
		out[i] = c.code
	}
	return out
}