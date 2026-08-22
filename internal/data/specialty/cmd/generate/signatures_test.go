package main

import (
	"strings"
	"testing"
)

func TestComputeDomainSignatures(t *testing.T) {
	keywords := map[string][]string{
		"207Q00000X": {"family", "medicine", "medical", "care"},
		"2084P0800X": {"psychiatrist", "mental", "behavioral", "disorders"},
	}

	keywordMap := map[string]string{
		"family":     "primary-care",
		"medicine":   "primary-care",
		"medical":    "primary-care",
		"care":       "primary-care",
		"mental":     "mental-health",
		"behavioral": "mental-health",
		"disorders":  "mental-health",
	}

	signatures := computeDomainSignatures(keywords, keywordMap)

	// Check Family Medicine
	fmSig, ok := signatures["207Q00000X"]
	if !ok {
		t.Fatal("expected signature for Family Medicine")
	}
	if len(fmSig) != 1 {
		t.Errorf("expected 1 domain, got %d", len(fmSig))
	}
	if fmSig[0] != "primary-care" {
		t.Errorf("expected 'primary-care', got '%s'", fmSig[0])
	}

	// Check Psychiatry
	psySig, ok := signatures["2084P0800X"]
	if !ok {
		t.Fatal("expected signature for Psychiatry")
	}
	if len(psySig) != 1 {
		t.Errorf("expected 1 domain, got %d", len(psySig))
	}
	if psySig[0] != "mental-health" {
		t.Errorf("expected 'mental-health', got '%s'", psySig[0])
	}
}

func TestJaccardSimilarity(t *testing.T) {
	setA := []string{"primary-care", "preventive"}
	setB := []string{"primary-care", "chronic-disease"}
	setC := []string{"mental-health", "behavioral"}

	// Same domain should be 1.0
	sim := jaccardSimilarity(setA, setA)
	if sim != 1.0 {
		t.Errorf("expected 1.0 for same set, got %f", sim)
	}

	// Partial overlap: intersection = {primary-care} = 1
	// union = {primary-care, preventive, chronic-disease} = 3
	// Jaccard = 1/3 = 0.333...
	sim = jaccardSimilarity(setA, setB)
	if sim < 0.3 || sim > 0.4 {
		t.Errorf("expected ~0.33 for partial overlap, got %f", sim)
	}

	// No overlap
	sim = jaccardSimilarity(setA, setC)
	if sim != 0.0 {
		t.Errorf("expected 0.0 for no overlap, got %f", sim)
	}
}

// containsPath reports whether any signature entry starts with the given
// domain path prefix.
func containsPath(signature []string, prefix string) bool {
	for _, p := range signature {
		if strings.HasPrefix(p, prefix) {
			return true
		}
	}
	return false
}

// TestComputeDomainSignaturesRealCorpus runs signature computation over the
// cached corpus with the authored keyword map and asserts the plan DoD:
// >=95% of codes get signatures, psychology/psychiatry land on mental-health
// paths, orthopaedics lands on the musculoskeletal path, and no NUCC grouping
// name pollutes a signature.
func TestComputeDomainSignaturesRealCorpus(t *testing.T) {
	stopWords := loadStopWordSet(t)
	keywords := extractKeywords(loadNuccDefinitions(t), stopWords, 10)
	keywordMap := loadJSONConfig[map[string]string](t, "keyword-map.json")
	nodes := loadNuccNodes(t)
	groupingMap := loadJSONConfig[map[string]string](t, "grouping-to-domain.json")

	signatures := computeDomainSignatures(keywords, keywordMap)
	full := ensureDomainSignatures(signatures, nodes, groupingMap)

	withSig := 0
	for _, sig := range full {
		if len(sig) > 0 {
			withSig++
		}
	}
	if withSig*100 < len(nodes)*95 {
		t.Errorf("expected >=95%% codes with signatures, got %d/%d",
			withSig, len(nodes))
	}

	for _, code := range []string{"103T00000X", "2084P0800X"} {
		if !containsPath(full[code], "mental-emotional-health") {
			t.Errorf("%s: expected a mental-health path, got %v", code, full[code])
		}
	}
	if !containsPath(full["207X00000X"], "physical-health.musculoskeletal") {
		t.Errorf("207X00000X: expected musculoskeletal path, got %v", full["207X00000X"])
	}

	for _, dom := range full["2084P0800X"] {
		if strings.Contains(dom, "&") || strings.Contains(dom, "Providers") {
			t.Errorf("2084P0800X: grouping-name pollution %q", dom)
		}
	}
}

func TestWeightedJaccardSimilarity(t *testing.T) {
	setA := []string{"primary-care", "mental-health"}
	setB := []string{"primary-care", "musculoskeletal"}

	weights := map[string]float64{
		"primary-care":    1.0,
		"mental-health":   1.0,
		"musculoskeletal": 0.5,
	}

	sim := weightedJaccardSimilarity(setA, setB, weights)
	// Intersection: primary-care (1.0)
	// Union: primary-care (1.0), mental-health (1.0), musculoskeletal (0.5) = 2.5
	// Jaccard = 1.0 / 2.5 = 0.4
	if sim != 0.4 {
		t.Errorf("expected 0.4, got %f", sim)
	}
}
