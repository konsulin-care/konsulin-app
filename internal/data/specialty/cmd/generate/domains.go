package main

import (
	"fmt"
	"sort"
)

// applyCompetenceSignatures derives every code's ICF domain signature from
// the authored competence matrix: a code-level exception (when present), else
// the classification-level competence (deep codes inherit), else the
// grouping fallback. Signatures are never text-derived.
//
// @param nodes - parsed NUCC provider nodes
// @param groupingDomainMap - authored grouping -> core domain path (fallback)
// @param competenceMap - authored "Grouping|Classification" -> ICF paths
// @param codeExceptions - authored NUCC code -> ICF paths (overrides)
// @returns signature per code, every code covered
func applyCompetenceSignatures(
	nodes map[string]*nuccNode,
	groupingDomainMap map[string]string,
	competenceMap map[string][]string,
	codeExceptions map[string][]string,
) map[string][]string {
	out := make(map[string][]string, len(nodes))
	for code, node := range nodes {
		switch {
		case len(codeExceptions[code]) > 0:
			out[code] = codeExceptions[code]
		case len(competenceMap[competenceKey(node)]) > 0:
			out[code] = competenceMap[competenceKey(node)]
		default:
			if dom := groupingDomainMap[node.Grouping]; dom != "" {
				out[code] = []string{dom}
			}
		}
	}
	return out
}

// competenceKey builds the "Grouping|Classification" matrix key for a node.
func competenceKey(node *nuccNode) string {
	return node.Grouping + "|" + node.Classification
}

// printCompetenceReview emits one line per authored classification mapping to
// stdout so `make data-specialty` doubles as a review report: every
// classification, its competence paths, and the number of codes inheriting
// them. Codes whose signature differs from their classification (code
// exceptions or grouping fallback) are listed explicitly.
func printCompetenceReview(
	signatures map[string][]string,
	nodes map[string]*nuccNode,
	competenceMap map[string][]string,
) {
	inherited := map[string][]string{}
	exceptions := []string{}
	for code, node := range nodes {
		if key := competenceKey(node); len(competenceMap[key]) > 0 {
			if equalPaths(signatures[code], competenceMap[key]) {
				inherited[key] = append(inherited[key], code)
			} else {
				exceptions = append(exceptions, fmt.Sprintf("%s (%s) -> %v",
					code, key, signatures[code]))
			}
		}
	}
	for _, key := range sortedMatrixKeys(competenceMap) {
		paths := competenceMap[key]
		fmt.Printf("  %-70s (%d codes)\n", key, len(inherited[key]))
		for _, p := range paths {
			fmt.Printf("      %s\n", p)
		}
	}
	if len(exceptions) > 0 {
		fmt.Println("Code-level exceptions:")
		for _, e := range exceptions {
			fmt.Printf("      %s\n", e)
		}
	}
}

// sortedMatrixKeys returns the competence matrix keys in deterministic order.
func sortedMatrixKeys(m map[string][]string) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

// equalPaths reports whether two path lists contain the same elements in the
// same order (matrix lists are authored sorted and deduplicated).
func equalPaths(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}