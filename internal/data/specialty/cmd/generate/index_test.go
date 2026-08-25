package main

import (
	"testing"
)

func TestBuildInvertedIndex(t *testing.T) {
	keywords := map[string][]string{
		"207Q00000X": {"family", "medicine", "care"},
		"2084P0800X": {"psychiatrist", "mental", "care"},
	}

	index := buildInvertedIndex(keywords)

	// Check that "care" maps to both codes
	codes := index["care"]
	if len(codes) != 2 {
		t.Errorf("expected 2 codes for 'care', got %d", len(codes))
	}

	// Check that "family" maps to only one code
	codes = index["family"]
	if len(codes) != 1 {
		t.Errorf("expected 1 code for 'family', got %d", len(codes))
	}
}

func TestBuildDirectIndex(t *testing.T) {
	nuccNodes := map[string]*nuccNode{
		"207Q00000X": {
			Code:           "207Q00000X",
			Grouping:       "Allopathic & Osteopathic Physicians",
			Classification: "Family Medicine",
			DisplayName:    "Family Medicine Physician",
		},
	}

	nuccToIsco := map[string]string{
		"207Q00000X": "2211",
	}

	domainSignatures := map[string][]string{
		"207Q00000X": {"primary-care"},
	}

	index := buildDirectIndex(nuccNodes, nuccToIsco, domainSignatures)

	node, ok := index["207Q00000X"]
	if !ok {
		t.Fatal("expected node to be found")
	}
	if node.IscoCode != "2211" {
		t.Errorf("expected IscoCode '2211', got '%s'", node.IscoCode)
	}
	if node.Label != "Family Medicine Physician" {
		t.Errorf("expected Label 'Family Medicine Physician', got '%s'", node.Label)
	}
}
