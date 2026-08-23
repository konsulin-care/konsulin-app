package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// loadCompetenceExceptions reads the code-level competence exceptions from
// config/specialty-competence-exceptions.json (NUCC code -> ICF paths),
// overriding a code's inherited classification competence.
func loadCompetenceExceptions(t *testing.T) map[string][]string {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(packageDir(), "..", "..", "config", "specialty-competence-exceptions.json"))
	if err != nil {
		// Absent exceptions file is legal (empty overrides).
		return map[string][]string{}
	}
	var exceptions map[string][]string
	if err := json.Unmarshal(data, &exceptions); err != nil {
		t.Fatalf("parsing specialty-competence-exceptions.json: %v", err)
	}
	return exceptions
}

// containsPath is defined in signatures_test.go (prefix match on a signature).

// TestApplyCompetenceSignatures covers the matrix application rules with
// synthetic nodes: classification competence inherits to deep codes, code
// exceptions override the inherited set, and the grouping fallback covers
// absent classifications (expected none in the real corpus).
func TestApplyCompetenceSignatures(t *testing.T) {
	nodes := map[string]*nuccNode{
		"2084P0800X": {Code: "2084P0800X", Grouping: "Allopathic & Osteopathic Physicians", Classification: "Psychiatry & Neurology"},
		"103T00000X": {Code: "103T00000X", Grouping: "Behavioral Health & Social Service Providers", Classification: "Psychologist"},
		"103TF0200X": {Code: "103TF0200X", Grouping: "Behavioral Health & Social Service Providers", Classification: "Psychologist"},
		"9999":       {Code: "9999", Grouping: "Unknown Group", Classification: "Unknown Class"},
	}
	competence := map[string][]string{
		"Allopathic & Osteopathic Physicians|Psychiatry & Neurology": {
			"mental-emotional-health.mood-disorders", "mental-emotional-health.general",
			"physical-health.neurological",
		},
		"Behavioral Health & Social Service Providers|Psychologist": {
			"mental-emotional-health.general", "meaning-purpose-fulfilment.self-esteem",
			"social-health-relationships.communication",
		},
	}
	exceptions := map[string][]string{
		// Forensic psychologist: legal/mental scope, no meaning-purpose domain.
		"103TF0200X": {"mental-emotional-health.general", "mental-emotional-health.trauma-grief"},
	}
	groupingMap := map[string]string{
		"Unknown Group": "physical-health",
	}

	got := applyCompetenceSignatures(nodes, groupingMap, competence, exceptions)

	psych, ok := got["2084P0800X"]
	if !ok || !containsPath(psych, "mental-emotional-health.mood-disorders") {
		t.Errorf("psychiatry signature = %v, want mental-emotional-health paths", got["2084P0800X"])
	}
	psychol, ok := got["103T00000X"]
	if !ok || !containsPath(psychol, "meaning-purpose-fulfilment.self-esteem") ||
		!containsPath(psychol, "social-health-relationships.communication") {
		t.Errorf("psychologist signature = %v, want meaning + social paths", got["103T00000X"])
	}
	forensic, ok := got["103TF0200X"]
	if !ok || len(forensic) != 2 || containsPath(forensic, "meaning-purpose-fulfilment") {
		t.Errorf("forensic exception = %v, want 2 mental-only paths", got["103TF0200X"])
	}
	if got["9999"] == nil || len(got["9999"]) != 1 || got["9999"][0] != "physical-health" {
		t.Errorf("grouping fallback = %v, want physical-health", got["9999"])
	}
}

// TestCompetenceSignaturesFullCorpus runs the competence application over the
// whole cached NUCC corpus with the committed configs, asserting the Step 3
// DoD: every code carries at least one ICF path, psychiatry lands in the
// mental domain, the psychologist class spans mental+meaning+social, and no
// signature is text-derived (all paths come from the authored matrix).
func TestCompetenceSignaturesFullCorpus(t *testing.T) {
	nodes := loadNuccNodes(t)
	groupingMap := loadJSONConfig[map[string]string](t, "grouping-to-domain.json")
	competence := loadCompetenceMatrix(t)
	exceptions := loadCompetenceExceptions(t)
	valid := validDomainPaths(t)

	got := applyCompetenceSignatures(nodes, groupingMap, competence, exceptions)

	if len(got) != len(nodes) {
		t.Errorf("expected signatures for %d codes, got %d", len(nodes), len(got))
	}
	for code, sig := range got {
		if len(sig) == 0 {
			t.Errorf("%s: no domain path", code)
			continue
		}
		for _, p := range sig {
			if !valid[p] {
				t.Errorf("%s: signature path %q not in domain taxonomy", code, p)
			}
		}
	}
	if !containsPath(got["2084P0800X"], "mental-emotional-health.general") {
		t.Errorf("2084P0800X signature %v lacks mental-emotional-health.general", got["2084P0800X"])
	}
	if !containsPath(got["103T00000X"], "mental-emotional-health.cognitive-behavioral") ||
		!containsPath(got["103T00000X"], "meaning-purpose-fulfilment.self-esteem") ||
		!containsPath(got["103T00000X"], "social-health-relationships.communication") {
		t.Errorf("103T00000X signature %v must span mental+meaning+social", got["103T00000X"])
	}
	if containsPath(got["103TF0200X"], "meaning-purpose-fulfilment.self-esteem") ||
		containsPath(got["103TF0200X"], "meaning-purpose-fulfilment") {
		t.Errorf("103TF0200X exception signature %v must stay out of meaning-purpose", got["103TF0200X"])
	}
}

// TestCompetenceExceptionPathsAreWellFormed validates the exceptions schema.
func TestCompetenceExceptionPathsAreWellFormed(t *testing.T) {
	exceptions := loadCompetenceExceptions(t)
	if len(exceptions) == 0 {
		t.Fatal("expected at least the forensic-psychologist exception")
	}
	nodes := loadNuccNodes(t)
	valid := validDomainPaths(t)
	for code, paths := range exceptions {
		if _, ok := nodes[code]; !ok {
			t.Errorf("exception code %q not found in NUCC cache", code)
		}
		for _, p := range paths {
			if !valid[p] {
				t.Errorf("exception %q references unknown path %q", code, p)
			}
			if parts := strings.Split(p, "."); len(parts) > 2 {
				t.Errorf("exception %q path %q exceeds depth 2", code, p)
			}
		}
	}
}