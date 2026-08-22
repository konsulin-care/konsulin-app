package main

import (
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
