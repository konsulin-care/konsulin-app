package main

// This file pins the exact top-1 resolutions for the complaints where the
// domain-gated ontology winning code is unambiguous, protecting against
// silent regression when the pipeline inputs change.

import "testing"

// loadResolutionHarness builds the shared inputs for resolution tests.
func loadResolutionHarness(t *testing.T) (map[string]interviewNodeConfig, map[string][]string, map[string][]string, map[string]string, map[string]string) {
	t.Helper()
	stopWords := loadStopWordSet(t)
	definitions := loadNuccDefinitions(t)
	nodes := loadNuccNodes(t)
	groupingMap := loadJSONConfig[map[string]string](t, "grouping-to-domain.json")
	domainsCfg := loadJSONConfig[map[string]interface{}](t, "domains.json")
	interview := loadJSONConfig[map[string]interviewNodeConfig](t, "interview-map.json")
	competence := loadCompetenceMatrix(t)
	exceptions := loadCompetenceExceptions(t)

	keywords := extractKeywords(definitions, stopWords, 10)
	signatures := applyCompetenceSignatures(nodes, groupingMap, competence, exceptions)
	labels := make(map[string]string, len(nodes))
	for code, node := range nodes {
		labels[code] = node.DisplayName
	}
	fallbacks := make(map[string]string, len(domainsCfg))
	for core, cfg := range domainsCfg {
		obj := cfg.(map[string]interface{})
		fallbacks[core] = obj["fallbackNuccCode"].(string)
	}
	return interview, signatures, keywords, labels, fallbacks
}

// TestResolutionExactWinners asserts the exact winning NUCC code for a
// curated subset of complaints whose domain-gated resolution is
// deterministic and clinically unmistakable.
func TestResolutionExactWinners(t *testing.T) {
	interview, signatures, keywords, labels, fallbacks := loadResolutionHarness(t)
	resolved := resolveInterviewNodes(interview, signatures, keywords, labels, fallbacks, loadJSONConfig[map[string]string](t, "keyword-map.json"))

	exact := map[string]string{
		"pain-musculoskeletal": "207X00000X", // Orthopaedic Surgery
		"gastrointestinal":     "207RG0100X", // Gastroenterology
		"fever-malaise":        "208D00000X", // General Practice
		"low-mood":             "2084P0800X", // Psychiatry
		"burnout":              "103T00000X", // Psychologist
		"mood-swings":          "2084P0800X", // Psychiatry
		"alcohol-substance":    "2084P0802X", // Addiction Psychiatry
		"smoking-cessation":    "103TA0400X", // Addiction Psychologist
		"couple-conflict":      "103TS0200X", // School Psychologist
		"family-dynamics":      "103TS0200X", // School Psychologist
		"focus-attention":      "103G00000X", // Clinical Neuropsychologist
		"daily-activities":     "208100000X", // Physical Medicine & Rehabilitation
		"mobility-balance":     "208100000X", // Physical Medicine & Rehabilitation
		"eating-weight":        "133VN1006X", // Metabolic Nutrition Dietitian
		"career-direction":     "103T00000X", // Psychologist
		"ergonomic-strain":     "207X00000X", // Orthopaedic Surgery
		"respiratory-airway":   "207RP1001X", // Pulmonary Disease
	}
	for id, want := range exact {
		if got := resolved[id].NuccCode; got != want {
			t.Errorf("resolve(%s) = %s, want %s (score %.3f)",
				id, got, want, resolved[id].Score)
		}
	}
}