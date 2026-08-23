package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"
)

// validDomainPaths builds the set of well-formed ICF paths (bare core or
// core.subdomain) from domains.json. Both bare cores and leaf paths are
// legal in domain signatures and competence entries.
func validDomainPaths(t *testing.T) map[string]bool {
	t.Helper()
	type domainConfig struct {
		FallbackNuccCode string                    `json:"fallbackNuccCode"`
		Subdomains       map[string]map[string]any `json:"subdomains"`
	}
	domains := loadJSONConfig[map[string]domainConfig](t, "domains.json")
	valid := make(map[string]bool)
	for core, cfg := range domains {
		valid[core] = true
		for sub := range cfg.Subdomains {
			valid[core+"."+sub] = true
		}
	}
	return valid
}

// loadCompetenceMatrix reads the authored classification-level competence
// matrix from config/specialty-competence.json, keyed "Grouping|Classification".
func loadCompetenceMatrix(t *testing.T) map[string][]string {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(packageDir(), "..", "..", "config", "specialty-competence.json"))
	if err != nil {
		t.Fatalf("reading specialty-competence.json: %v", err)
	}
	var matrix map[string][]string
	if err := json.Unmarshal(data, &matrix); err != nil {
		t.Fatalf("parsing specialty-competence.json: %v", err)
	}
	return matrix
}

// TestCompetenceMatrixCoversEveryClassification asserts the DoD for the
// authored matrix: every (grouping, classification) pair present in the NUCC
// cache has a competence entry, every entry maps to at least one well-formed
// ICF path, and no entry references a path outside the domains.json taxonomy
// (no orphans).
func TestCompetenceMatrixCoversEveryClassification(t *testing.T) {
	matrix := loadCompetenceMatrix(t)
	nodes := loadNuccNodes(t)

	pairs := map[string]bool{}
	for _, node := range nodes {
		pairs[node.Grouping+"|"+node.Classification] = true
	}
	if len(pairs) == 0 {
		t.Fatal("no classifications found in NUCC cache")
	}
	total := 0
	for _, key := range sortedKeys(pairs) {
		paths, ok := matrix[key]
		if !ok {
			t.Errorf("classification %q has no competence entry", key)
			continue
		}
		if len(paths) == 0 {
			t.Errorf("classification %q has an empty competence list", key)
			continue
		}
		seen := map[string]bool{}
		for _, p := range paths {
			if seen[p] {
				t.Errorf("classification %q lists duplicate path %q", key, p)
			}
			seen[p] = true
		}
		total++
	}
	if total != len(pairs) {
		t.Errorf("covered %d of %d classification pairs", total, len(pairs))
	}
}

// TestCompetenceMatrixPathsAreWellFormed asserts every path in the matrix is
// either a bare core domain or a core.subdomain present in domains.json.
func TestCompetenceMatrixPathsAreWellFormed(t *testing.T) {
	matrix := loadCompetenceMatrix(t)
	valid := validDomainPaths(t)

	for cls, paths := range matrix {
		if !strings.Contains(cls, "|") {
			t.Errorf("classification key %q is not Grouping|Classification", cls)
		}
		for _, p := range paths {
			if !valid[p] {
				t.Errorf("classification %q references unknown path %q", cls, p)
			}
			if parts := strings.Split(p, "."); len(parts) > 2 {
				t.Errorf("classification %q path %q exceeds depth 2", cls, p)
			}
		}
	}
}

// TestCompetenceMatrixSize asserts the authored matrix covers the expected
// breadth of the taxonomy (163 Individual classification pairs).
func TestCompetenceMatrixSize(t *testing.T) {
	matrix := loadCompetenceMatrix(t)
	if len(matrix) < 150 {
		t.Errorf("expected ~163 classification entries, got %d", len(matrix))
	}
}

// sortedKeys returns the keys of a string set in deterministic order.
func sortedKeys(set map[string]bool) []string {
	out := make([]string, 0, len(set))
	for k := range set {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}
