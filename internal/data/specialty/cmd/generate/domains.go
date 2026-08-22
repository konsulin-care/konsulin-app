package main

// buildKeywordDomainMap derives a keyword-to-domain mapping from NUCC
// groupings: each keyword maps to the grouping most frequent among codes whose
// keyword list contains it. Ties resolve to the lexicographically smallest
// grouping name. Keywords from codes without a grouping are skipped.
func buildKeywordDomainMap(keywords map[string][]string, nodes map[string]*nuccNode) map[string]string {
	groupingCounts := make(map[string]map[string]int)

	for code, codeKeywords := range keywords {
		node := nodes[code]
		if node == nil || node.Grouping == "" {
			continue
		}
		for _, kw := range codeKeywords {
			if groupingCounts[kw] == nil {
				groupingCounts[kw] = make(map[string]int)
			}
			groupingCounts[kw][node.Grouping]++
		}
	}

	domainMap := make(map[string]string)
	for kw, counts := range groupingCounts {
		domainMap[kw] = mostFrequentGrouping(counts)
	}

	return domainMap
}

// mostFrequentGrouping returns the grouping with the highest count, breaking
// ties by lexicographically smallest name. Returns "" for an empty map.
func mostFrequentGrouping(counts map[string]int) string {
	best := ""
	bestCount := 0
	for grouping, count := range counts {
		if count > bestCount || (count == bestCount && (best == "" || grouping < best)) {
			best = grouping
			bestCount = count
		}
	}
	return best
}

// mergeKeywordDomainMaps merges auto-derived mappings with authored overrides.
// Authored overrides win on key conflicts.
func mergeKeywordDomainMaps(auto, overrides map[string]string) map[string]string {
	merged := make(map[string]string, len(auto)+len(overrides))
	for kw, domain := range auto {
		merged[kw] = domain
	}
	for kw, domain := range overrides {
		merged[kw] = domain
	}
	return merged
}
