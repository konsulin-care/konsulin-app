package main

import (
	"encoding/json"
	"os"
	"path/filepath"
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
// cache has a competence entry, and no stale entries exist. Delegates to the
// production validator wired into go generate.
func TestCompetenceMatrixCoversEveryClassification(t *testing.T) {
	cfg := &generatorConfig{
		competenceMap:    loadCompetenceMatrix(t),
		validDomainPaths: validDomainPaths(t),
	}
	if err := validateCompetenceConfig(cfg, loadNuccNodes(t)); err != nil {
		t.Fatalf("committed competence matrix must validate: %v", err)
	}
}

// TestCompetenceMatrixPathsAreWellFormed asserts every path in the matrix is
// a bare core domain or a core.subdomain present in domains.json, and the
// code-level exceptions stay within the same taxonomy. Delegates to the
// production validator: matrix coverage, stale keys, empty/duplicate lists,
// and path well-formedness are all checked together.
func TestCompetenceMatrixPathsAreWellFormed(t *testing.T) {
	cfg := &generatorConfig{
		competenceMap:        loadCompetenceMatrix(t),
		competenceExceptions: loadCompetenceExceptions(t),
		validDomainPaths:     validDomainPaths(t),
	}
	if err := validateCompetenceConfig(cfg, loadNuccNodes(t)); err != nil {
		t.Fatalf("committed competence entries reference only valid paths: %v", err)
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
