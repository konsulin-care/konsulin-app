package main

// computeDomainSignatures computes domain signatures for each NUCC code.
func computeDomainSignatures(keywords map[string][]string, keywordMap map[string]string) map[string][]string {
	signatures := make(map[string][]string)

	for code, codeKeywords := range keywords {
		domainSet := make(map[string]bool)
		for _, kw := range codeKeywords {
			if domain, ok := keywordMap[kw]; ok {
				domainSet[domain] = true
			}
		}

		// Convert set to slice
		var domains []string
		for d := range domainSet {
			domains = append(domains, d)
		}
		if len(domains) > 0 {
			signatures[code] = domains
		}
	}

	return signatures
}

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
