package main

import (
	"testing"
)

func TestEnsureDomainSignatures(t *testing.T) {
	signatures := map[string][]string{
		"207Q00000X": {"physical-health"},
	}
	nodes := map[string]*nuccNode{
		"207Q00000X": {Code: "207Q00000X", Grouping: "Allopathic & Osteopathic Physicians"},
		"103G00000X": {Code: "103G00000X", Grouping: "Behavioral Health & Social Service Providers"},
		"9999":       {Code: "9999", Grouping: "Unknown Group"},
	}
	groupingMap := map[string]string{
		"Allopathic & Osteopathic Physicians":      "physical-health",
		"Behavioral Health & Social Service Providers": "mental-emotional-health",
	}

	got := ensureDomainSignatures(signatures, nodes, groupingMap)

	// Authored signatures are preserved untouched.
	if len(got["207Q00000X"]) != 1 || got["207Q00000X"][0] != "physical-health" {
		t.Errorf("expected authored signature preserved, got %v", got["207Q00000X"])
	}
	// Empty signatures are filled from the grouping fallback.
	if len(got["103G00000X"]) != 1 || got["103G00000X"][0] != "mental-emotional-health" {
		t.Errorf("expected grouping fallback, got %v", got["103G00000X"])
	}
	// Unmapped groupings stay uncovered.
	if len(got["9999"]) != 0 {
		t.Errorf("expected empty signature for unmapped grouping, got %v", got["9999"])
	}
}
