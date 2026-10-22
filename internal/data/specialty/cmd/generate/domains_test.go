package main

import (
	"testing"
)

func TestApplyCompetenceSignaturesGroupingFallback(t *testing.T) {
	nodes := map[string]*nuccNode{
		"207Q00000X": {Code: "207Q00000X", Grouping: "Allopathic & Osteopathic Physicians", Classification: "Family Medicine"},
		"103G00000X": {Code: "103G00000X", Grouping: "Behavioral Health & Social Service Providers", Classification: "Psychologist"},
		"9999":       {Code: "9999", Grouping: "Unknown Group", Classification: "Unknown Class"},
	}
	groupingMap := map[string]string{
		"Allopathic & Osteopathic Physicians":          "physical-health",
		"Behavioral Health & Social Service Providers": "mental-emotional-health",
	}
	competenceMap := map[string][]string{
		"Allopathic & Osteopathic Physicians|Family Medicine": {"physical-health.general"},
	}
	exceptions := map[string][]string{}

	got := applyCompetenceSignatures(nodes, groupingMap, competenceMap, exceptions)

	// Classification-level competence applies.
	if len(got["207Q00000X"]) != 1 || got["207Q00000X"][0] != "physical-health.general" {
		t.Errorf("expected classification competence, got %v", got["207Q00000X"])
	}
	// Absent classification falls back to the grouping map.
	if len(got["103G00000X"]) != 1 || got["103G00000X"][0] != "mental-emotional-health" {
		t.Errorf("expected grouping fallback, got %v", got["103G00000X"])
	}
	// Unmapped groupings stay uncovered.
	if len(got["9999"]) != 0 {
		t.Errorf("expected empty signature for unmapped grouping, got %v", got["9999"])
	}
}

func TestCompetenceKey(t *testing.T) {
	node := &nuccNode{Grouping: "A", Classification: "B"}
	if got := competenceKey(node); got != "A|B" {
		t.Errorf("expected A|B, got %q", got)
	}
}
