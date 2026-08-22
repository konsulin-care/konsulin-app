package main

// This file pins the exact top-1 resolutions for the complaints where the
// ontology winning code is unambiguous, protecting against silent regression
// when the pipeline inputs change.

import "testing"

// TestResolutionExactWinners asserts the exact winning NUCC code for a
// curated subset of complaints whose ontology resolution is deterministic
// and clinically unmistakable.
func TestResolutionExactWinners(t *testing.T) {
	stopWords := loadStopWordSet(t)
	definitions := loadNuccDefinitions(t)
	nodes := loadNuccNodes(t)
	keywordMap := loadJSONConfig[map[string]string](t, "keyword-map.json")
	groupingMap := loadJSONConfig[map[string]string](t, "grouping-to-domain.json")
	domainsCfg := loadJSONConfig[map[string]interface{}](t, "domains.json")
	interview := loadJSONConfig[map[string]interviewNodeConfig](t, "interview-map.json")

	keywords := extractKeywords(definitions, stopWords, 10)
	signatures := computeDomainSignatures(keywords, keywordMap)
	signatures = ensureDomainSignatures(signatures, nodes, groupingMap)

	labels := make(map[string]string, len(nodes))
	for code, node := range nodes {
		labels[code] = node.DisplayName
	}
	fallbacks := make(map[string]string, len(domainsCfg))
	for core, cfg := range domainsCfg {
		obj := cfg.(map[string]interface{})
		fallbacks[core] = obj["fallbackNuccCode"].(string)
	}

	resolved := resolveInterviewNodes(interview, signatures, keywords, labels, fallbacks, keywordMap)

	exact := map[string]string{
		"pain-musculoskeletal": "207X00000X", // Orthopaedic Surgery
		"gastrointestinal":     "207RG0100X", // Gastroenterology
		"fever-malaise":        "208D00000X", // General Practice
		"low-mood":             "2084P0800X", // Psychiatry
		"burnout":              "2084P0800X", // Psychiatry
		"mood-swings":          "2084P0800X", // Psychiatry
		"alcohol-substance":    "2084P0802X", // Addiction Psychiatry
		"smoking-cessation":    "103TA0400X", // Addiction Psychologist
		"couple-conflict":      "106H00000X", // Marriage & Family Therapist
		"family-dynamics":      "106H00000X", // Marriage & Family Therapist
		"focus-attention":      "103G00000X", // Clinical Neuropsychologist
		"daily-activities":     "103TR0400X", // Rehabilitation Psychologist
		"mobility-balance":     "208100000X", // Physical Medicine & Rehabilitation
		"eating-weight":        "133VN1006X", // Metabolic Nutrition Dietitian
		"career-direction":     "103T00000X", // Psychologist
		"ergonomic-strain":     "207X00000X", // Orthopaedic Surgery
	}
	for id, want := range exact {
		if got := resolved[id].NuccCode; got != want {
			t.Errorf("resolve(%s) = %s, want %s (score %.3f)",
				id, got, want, resolved[id].Score)
		}
	}
}