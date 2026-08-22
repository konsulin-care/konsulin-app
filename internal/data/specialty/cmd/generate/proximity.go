package main

// computeProximity computes the proximity table for all specialty pairs.
func computeProximity(
	iscoNodes map[string]*iscoNode,
	nuccNodes map[string]*nuccNode,
	nuccToIsco map[string]string,
	domainSignatures map[string][]string,
) map[string]map[string]float64 {
	proximity := make(map[string]map[string]float64)

	// Initialize proximity table
	for code := range nuccNodes {
		proximity[code] = make(map[string]float64)
		proximity[code][code] = 1.0 // Self-proximity is 1.0
	}

	// Compute pairwise proximity
	codes := make([]string, 0, len(nuccNodes))
	for code := range nuccNodes {
		codes = append(codes, code)
	}

	for i := 0; i < len(codes); i++ {
		for j := i + 1; j < len(codes); j++ {
			codeA := codes[i]
			codeB := codes[j]

			score := combinedProximity(codeA, codeB, iscoNodes, nuccNodes, nuccToIsco, domainSignatures)
			proximity[codeA][codeB] = score
			proximity[codeB][codeA] = score // Symmetric
		}
	}

	return proximity
}

// combinedProximity computes the weighted combination of proximity measures.
func combinedProximity(
	codeA, codeB string,
	iscoNodes map[string]*iscoNode,
	nuccNodes map[string]*nuccNode,
	nuccToIsco map[string]string,
	domainSignatures map[string][]string,
) float64 {
	structural := structuralProximity(codeA, codeB, nuccToIsco, iscoNodes)
	clinical := clinicalProximity(codeA, codeB, nuccNodes)
	domain := domainProximity(codeA, codeB, domainSignatures)

	// Weighted combination: 0.6 * clinical + 0.3 * domain + 0.1 * structural
	return 0.6*clinical + 0.3*domain + 0.1*structural
}

// structuralProximity computes proximity based on ISCO-08 hierarchy.
func structuralProximity(codeA, codeB string, nuccToIsco map[string]string, iscoNodes map[string]*iscoNode) float64 {
	iscoA := nuccToIsco[codeA]
	iscoB := nuccToIsco[codeB]

	if iscoA == "" || iscoB == "" {
		return 0
	}

	return structuralDistance(iscoA, iscoB, iscoNodes)
}

// clinicalProximity computes proximity based on NUCC grouping/classification.
func clinicalProximity(codeA, codeB string, nuccNodes map[string]*nuccNode) float64 {
	nodeA, okA := nuccNodes[codeA]
	nodeB, okB := nuccNodes[codeB]

	if !okA || !okB {
		return 0
	}

	// Same classification → 1.0
	if nodeA.Classification == nodeB.Classification {
		return 1.0
	}

	// Same grouping → 0.7
	if nodeA.Grouping == nodeB.Grouping {
		return 0.7
	}

	// Different grouping → 0.3
	return 0.3
}

// domainProximity computes proximity based on domain signature Jaccard similarity.
func domainProximity(codeA, codeB string, domainSignatures map[string][]string) float64 {
	sigA := domainSignatures[codeA]
	sigB := domainSignatures[codeB]

	if len(sigA) == 0 && len(sigB) == 0 {
		return 0.5 // Default for no domains
	}

	return jaccardSimilarity(sigA, sigB)
}

// NormalizeProximityTable normalizes all values to 0-1 range.
func NormalizeProximityTable(table map[string]map[string]float64) {
	minVal, maxVal := proximityMinMax(table)

	// Normalize
	if maxVal > minVal {
		for codeA := range table {
			normalizeRow(table[codeA], codeA, minVal, maxVal)
		}
	}
}

// proximityMinMax finds the min and max values in the table.
func proximityMinMax(table map[string]map[string]float64) (minVal, maxVal float64) {
	minVal = 1.0
	maxVal = 0.0

	for _, row := range table {
		for _, val := range row {
			if val < minVal {
				minVal = val
			}
			if val > maxVal {
				maxVal = val
			}
		}
	}

	return minVal, maxVal
}

// normalizeRow scales non-diagonal values in a row into the 0-1 range.
func normalizeRow(row map[string]float64, codeA string, minVal, maxVal float64) {
	for codeB := range row {
		if codeA != codeB {
			row[codeB] = (row[codeB] - minVal) / (maxVal - minVal)
		}
	}
}
