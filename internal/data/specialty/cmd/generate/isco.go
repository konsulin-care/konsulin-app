package main

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
