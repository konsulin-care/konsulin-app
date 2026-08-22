package main

import (
	"sort"
	"strings"
)

// iscoNode represents a node in the ISCO-08 hierarchy.
type iscoNode struct {
	Code    string
	Display string
	Parent  string
	Depth   int
}

// parseISCO parses ISCO-08 JSON and returns a map of code to iscoNode.
func parseISCO(codeSystem map[string]any) (map[string]*iscoNode, error) {
	nodes := make(map[string]*iscoNode)

	concepts, ok := codeSystem["concept"].([]any)
	if !ok {
		return nodes, nil
	}

	var parseConcepts func(concepts []any, parent string, depth int)
	parseConcepts = func(concepts []any, parent string, depth int) {
		for _, c := range concepts {
			concept, ok := c.(map[string]any)
			if !ok {
				continue
			}

			code, _ := concept["code"].(string)
			display, _ := concept["display"].(string)

			nodes[code] = &iscoNode{
				Code:    code,
				Display: display,
				Parent:  parent,
				Depth:   depth,
			}

			if subConcepts, ok := concept["concept"].([]any); ok {
				parseConcepts(subConcepts, code, depth+1)
			}
		}
	}

	parseConcepts(concepts, "", 1)
	return nodes, nil
}

// findLCA finds the Lowest Common Ancestor of two nodes.
func findLCA(codeA, codeB string, nodes map[string]*iscoNode) string {
	if codeA == codeB {
		return codeA
	}

	// Build path from A to root
	pathA := make(map[string]bool)
	for code := codeA; code != ""; {
		pathA[code] = true
		node, ok := nodes[code]
		if !ok {
			break
		}
		code = node.Parent
	}

	// Find first ancestor of B that is in A's path
	for code := codeB; code != ""; {
		if pathA[code] {
			return code
		}
		node, ok := nodes[code]
		if !ok {
			break
		}
		code = node.Parent
	}

	return ""
}

// lastResortISCO is the fallback unit group when neither the curated
// classification table nor token similarity yields a match.
const lastResortISCO = "2212"

// singularize reduces a plural token to its singular form for display-name
// comparison (e.g. "psychologists" -> "psychologist"). Known plurals that
// are not simple suffixed forms are left untouched.
func singularize(tok string) string {
	if strings.HasSuffix(tok, "ies") && len(tok) > 4 {
		return tok[:len(tok)-3] + "y"
	}
	if strings.HasSuffix(tok, "s") &&
		!strings.HasSuffix(tok, "ss") &&
		!strings.HasSuffix(tok, "us") &&
		!strings.HasSuffix(tok, "is") &&
		len(tok) > 2 {
		return tok[:len(tok)-1]
	}
	return tok
}

// normalizedTokenSet tokenizes, synonym-normalizes, and singularizes text
// into a set of comparable tokens.
func normalizedTokenSet(text string, synonyms map[string]string) map[string]bool {
	out := make(map[string]bool)
	for _, tok := range tokenize(text) {
		t := tok
		if syn, ok := synonyms[t]; ok {
			t = syn
		}
		out[singularize(t)] = true
	}
	return out
}

// bestISCOMatch returns the ISCO unit-group code whose normalized display
// tokens maximize Jaccard similarity with the target token set. When no
// candidate has a positive score the returned code is empty. Ties resolve to
// the lexicographically smallest code for determinism.
func bestISCOMatch(target map[string]bool, iscoNodes map[string]*iscoNode, synonyms map[string]string) string {
	best := ""
	bestScore := 0.0
	codes := make([]string, 0, len(iscoNodes))
	for code := range iscoNodes {
		if len(code) == 4 { // unit groups only
			codes = append(codes, code)
		}
	}
	sort.Strings(codes)
	for _, code := range codes {
		display := normalizedTokenSet(iscoNodes[code].Display, synonyms)
		score := tokenJaccard(target, display)
		if score > bestScore {
			best = code
			bestScore = score
		}
	}
	return best
}

// tokenJaccard computes the Jaccard coefficient of two token sets.
func tokenJaccard(a, b map[string]bool) float64 {
	if len(a) == 0 || len(b) == 0 {
		return 0
	}
	inter := 0
	for tok := range a {
		if b[tok] {
			inter++
		}
	}
	union := len(a) + len(b) - inter
	return float64(inter) / float64(union)
}

// structuralDistance computes distance based on ISCO-08 hierarchy.
// Returns value between 0 and 1, where 1 is identical.
func structuralDistance(codeA, codeB string, nodes map[string]*iscoNode) float64 {
	if codeA == codeB {
		return 1.0
	}

	if _, okA := nodes[codeA]; !okA {
		return 0
	}
	if _, okB := nodes[codeB]; !okB {
		return 0
	}

	lca := findLCA(codeA, codeB, nodes)
	lcaNode, ok := nodes[lca]
	if !ok {
		return 0
	}

	// Distance = 1 - (1 / (1 + depth(LCA)))
	// Higher depth = closer
	return 1.0 - (1.0 / (1.0 + float64(lcaNode.Depth)))
}

// mapNUCCToISCO assigns every NUCC provider code an ISCO-08 unit group:
//
//  1. curated classification lookup (authoritative when present),
//  2. synonym-normalized token Jaccard between NUCC display/classification/
//     specialization and ISCO unit-group displays,
//  3. a secondary pass using the code's TF-IDF definition keywords,
//  4. the last-resort unit group 2212 (specialist medical practitioners).
//
// @param nuccNodes - parsed NUCC provider nodes
// @param keywords - refined TF-IDF keywords per NUCC code
// @param iscoNodes - parsed ISCO-08 hierarchy
// @param synonyms - authored token synonyms for display normalization
// @param classificationMap - curated classification name -> ISCO unit group
// @returns mapping of NUCC code to ISCO-08 unit-group code
func mapNUCCToISCO(
	nuccNodes map[string]*nuccNode,
	keywords map[string][]string,
	iscoNodes map[string]*iscoNode,
	synonyms map[string]string,
	classificationMap map[string]string,
) map[string]string {
	out := make(map[string]string, len(nuccNodes))
	for code, node := range nuccNodes {
		if isco, ok := classificationMap[node.Classification]; ok {
			out[code] = isco
			continue
		}
		target := normalizedTokenSet(
			strings.Join([]string{node.DisplayName, node.Classification, node.Specialization}, " "),
			synonyms,
		)
		isco := bestISCOMatch(target, iscoNodes, synonyms)
		if isco == "" {
			kwTarget := make(map[string]bool)
			for _, kw := range keywords[code] {
				kwTarget[singularize(kw)] = true
			}
			isco = bestISCOMatch(kwTarget, iscoNodes, synonyms)
		}
		if isco == "" {
			isco = lastResortISCO
		}
		out[code] = isco
	}
	return out
}
