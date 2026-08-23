package main

import (
	"strings"
	"testing"
)

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