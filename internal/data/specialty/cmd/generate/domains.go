package main

// ensureDomainSignatures fills codes whose keyword-derived signature is empty
// with a core-domain path derived from their NUCC grouping. The mapping is
// authored (config/grouping-to-domain.json) and bounded to the 18 groupings,
// so every provider code lands in the ICF domain space.
//
// @param signatures - signatures derived from the authored keyword map
// @param nodes - parsed NUCC provider nodes
// @param groupingDomainMap - authored grouping -> domain path
// @returns signatures for every code, empty entries filled from the grouping
func ensureDomainSignatures(
	signatures map[string][]string,
	nodes map[string]*nuccNode,
	groupingDomainMap map[string]string,
) map[string][]string {
	out := make(map[string][]string, len(nodes))
	for code, node := range nodes {
		if len(signatures[code]) > 0 {
			out[code] = signatures[code]
			continue
		}
		if dom := groupingDomainMap[node.Grouping]; dom != "" {
			out[code] = []string{dom}
		}
	}
	return out
}