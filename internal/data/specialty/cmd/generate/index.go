package main

import "github.com/konsulin-care/konsulin-app/internal/data/specialty"

// buildInvertedIndex builds a keyword → NUCC codes mapping.
func buildInvertedIndex(keywords map[string][]string) map[string][]string {
	index := make(map[string][]string)

	for code, codeKeywords := range keywords {
		for _, kw := range codeKeywords {
			index[kw] = append(index[kw], code)
		}
	}

	return index
}

// buildDirectIndex builds a NUCC code → SpecialtyNode mapping.
func buildDirectIndex(
	nuccNodes map[string]*nuccNode,
	nuccToIsco map[string]string,
	domainSignatures map[string][]string,
) map[string]*specialty.SpecialtyNode {
	index := make(map[string]*specialty.SpecialtyNode)

	for code, node := range nuccNodes {
		index[code] = &specialty.SpecialtyNode{
			NuccCode:        code,
			IscoCode:        nuccToIsco[code],
			Label:           node.DisplayName,
			DomainSignature: domainSignatures[code],
		}
	}

	return index
}
