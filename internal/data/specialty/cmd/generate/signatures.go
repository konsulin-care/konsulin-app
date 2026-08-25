package main

// jaccardSimilarity computes Jaccard similarity between two sets.
func jaccardSimilarity(setA, setB []string) float64 {
	if len(setA) == 0 && len(setB) == 0 {
		return 1.0
	}

	setBMap := make(map[string]bool)
	for _, item := range setB {
		setBMap[item] = true
	}

	intersection := 0
	for _, item := range setA {
		if setBMap[item] {
			intersection++
		}
	}

	union := len(setA) + len(setB) - intersection
	if union == 0 {
		return 0
	}

	return float64(intersection) / float64(union)
}

// weightedJaccardSimilarity computes weighted Jaccard similarity.
func weightedJaccardSimilarity(setA, setB []string, weights map[string]float64) float64 {
	if len(setA) == 0 && len(setB) == 0 {
		return 1.0
	}

	setBMap := make(map[string]bool)
	for _, item := range setB {
		setBMap[item] = true
	}

	// Compute intersection weight
	intersectionWeight := 0.0
	for _, item := range setA {
		if setBMap[item] {
			intersectionWeight += weights[item]
		}
	}

	// Compute union weight (all unique items)
	unionItems := make(map[string]bool)
	for _, item := range setA {
		unionItems[item] = true
	}
	for _, item := range setB {
		unionItems[item] = true
	}

	unionWeight := 0.0
	for item := range unionItems {
		unionWeight += weights[item]
	}

	if unionWeight == 0 {
		return 0
	}

	return intersectionWeight / unionWeight
}
