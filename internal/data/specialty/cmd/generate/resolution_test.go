package main

import "testing"

// expectedResolution sets pin every complaint either to an exact canonical
// NUCC code or to an allowed set of clinically adjacent codes (the ontology
// may legitimately land on a sub-specialization of the same family).
var expectedResolution = map[string][]string{
	"pain-musculoskeletal": {"207X00000X", "207XX0005X", "207XX0004X"},
	"headache-migraine":    {"207T00000X", "2084N0400X"},
	"respiratory-airway":   {"207RP1001X", "2080P0214X", "208D00000X"},
	"gastrointestinal":     {"207RG0100X", "208D00000X"},
	"sleep-fatigue":        {"207QS1201X", "207RS0012X", "207YS0012X"},
	"fever-malaise":        {"208D00000X", "207Q00000X"},
	"low-mood":             {"2084P0800X"},
	"anxiety-stress":       {"2084P0800X", "103T00000X"},
	"grief-trauma":         {"2084P0800X", "103T00000X"},
	"postpartum-mood":      {"2084P0800X"},
	"burnout":              {"2084P0800X"},
	"mood-swings":          {"2084P0800X"},
	"couple-conflict":      {"106H00000X", "103TC1900X"},
	"family-dynamics":      {"106H00000X", "103TC1900X"},
	"workplace-conflict":   {"104100000X", "1041C0700X", "2083X0100X"},
	"loneliness-isolation": {"103TC1900X", "103T00000X"},
	"communication-barriers": {"103TC1900X", "103T00000X", "235Z00000X"},
	"focus-attention":      {"103G00000X", "103T00000X"},
	"memory-decline":       {"103G00000X", "2084N0400X", "2084A2900X"},
	"daily-activities":     {"103TR0400X", "225100000X", "225800000X"},
	"work-performance":     {"2084F0202X", "2084P0800X", "2083X0100X"},
	"mobility-balance":     {"208100000X", "207X00000X", "225100000X"},
	"career-direction":     {"103T00000X", "174H00000X"},
	"existential-purpose":  {"2084H0002X", "103T00000X"},
	"life-transition":      {"2084P0800X", "103T00000X"},
	"motivation-selfesteem": {"103TF0200X", "103T00000X", "103TC0700X"},
	"smoking-cessation":    {"103TA0400X", "2084P0802X"},
	"alcohol-substance":    {"2084P0802X", "103TA0400X"},
	"eating-weight":        {"133VN1006X", "133N00000X", "133NN1002X"},
	"sedentary-habits":     {"207QS0010X", "208D00000X"},
	"caregiver-strain":     {"2084P0805X", "103T00000X"},
	"financial-stress":     {"2084P0800X"},
	"relocation-adjustment": {"2084P0800X", "103T00000X"},
	"ergonomic-strain":     {"207X00000X", "207XX0005X", "225100000X"},
	"other-physical":       {"208D00000X"},
	"other-mental":         {"103T00000X"},
	"other-social":         {"103T00000X"},
	"other-functional":     {"208D00000X"},
	"other-purpose":        {"103T00000X"},
	"other-lifestyle":      {"208D00000X"},
	"other-environmental":  {"208D00000X"},
}

// TestResolveInterviewNodes runs ontology resolution over the cached corpus
// and asserts the plan DoD: all 41 nodes resolve and every complaint lands on
// one of its expected (possibly adjacent) NUCC codes.
func TestResolveInterviewNodes(t *testing.T) {
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

	if len(resolved) != 41 {
		t.Errorf("expected 41 resolutions, got %d", len(resolved))
	}
	for id, r := range resolved {
		if r.NuccCode == "" {
			t.Errorf("%s: no resolution", id)
			continue
		}
		if r.Label == "" {
			t.Errorf("%s: missing label", id)
		}
		allowed, ok := expectedResolution[id]
		if !ok {
			t.Errorf("%s: no expected resolution defined", id)
			continue
		}
		if !contains(allowed, r.NuccCode) {
			t.Errorf("resolve(%s) = %s (%s, score %.3f), want one of %v",
				id, r.NuccCode, r.Label, r.Score, allowed)
		}
	}
}

// contains reports whether s is present in the slice.
func contains(items []string, s string) bool {
	for _, it := range items {
		if it == s {
			return true
		}
	}
	return false
}