package specialty

import (
	"sort"
	"strings"
	"unicode"
)

const (
	// matchThreshold is the minimum score for a match to be included.
	matchThreshold = 0.4
)

// MatchSpecialty takes user input and returns matching NUCC codes.
// Returns matches sorted by score (highest first), filtered by threshold.
func MatchSpecialty(input string, idx *SpecialtyIndex) []SpecialtyMatch {
	tokens := tokenizeInput(input)
	if len(tokens) == 0 {
		return nil
	}

	// Count matches per NUCC code
	codeScores := make(map[string]float64)
	for _, token := range tokens {
		codes := idx.LookupByKeyword(token)
		for _, code := range codes {
			codeScores[code]++
		}
	}

	// Normalize scores by number of tokens
	for code := range codeScores {
		codeScores[code] /= float64(len(tokens))
	}

	// Build matches
	var matches []SpecialtyMatch
	for code, score := range codeScores {
		if score < matchThreshold {
			continue
		}

		node := idx.LookupByNuccCode(code)
		if node == nil {
			continue
		}

		matches = append(matches, SpecialtyMatch{
			NuccCode: code,
			Label:    node.Label,
			Score:    score,
			Domains:  node.DomainSignature,
		})
	}

	// Sort by score (highest first)
	sort.Slice(matches, func(i, j int) bool {
		return matches[i].Score > matches[j].Score
	})

	return matches
}

// tokenizeInput splits user input into lowercase tokens.
func tokenizeInput(input string) []string {
	var tokens []string
	var current strings.Builder

	for _, r := range strings.ToLower(input) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			current.WriteRune(r)
		} else if current.Len() > 0 {
			tokens = append(tokens, current.String())
			current.Reset()
		}
	}
	if current.Len() > 0 {
		tokens = append(tokens, current.String())
	}

	return tokens
}
