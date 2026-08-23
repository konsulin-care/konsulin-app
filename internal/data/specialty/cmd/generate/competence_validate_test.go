package main

import (
	"strings"
	"testing"
)

// testValidDomainPaths returns a minimal domains.json-compatible path set:
// bare cores and core.subdomain leaves.
func testValidDomainPaths() map[string]bool {
	return map[string]bool{
		"physical-health":                              true,
		"physical-health.general":                      true,
		"mental-emotional-health":                      true,
		"mental-emotional-health.cognitive-behavioral": true,
		"meaning-purpose-fulfilment.self-esteem":       true,
		"social-health-relationships.communication":    true,
	}
}

// testValidatorNodes returns two NUCC nodes with distinct classification
// pairs, one of which also carries a real exception code.
func testValidatorNodes() map[string]*nuccNode {
	return map[string]*nuccNode{
		"103T00000X": {Code: "103T00000X", Grouping: "Behavioral Health & Social Service Providers", Classification: "Psychologist"},
		"207R00000X": {Code: "207R00000X", Grouping: "Allopathic & Osteopathic Physicians", Classification: "Internal Medicine"},
	}
}

// competenceTestConfig builds a generatorConfig carrying only the fields the
// validator reads.
func competenceTestConfig(matrix, exceptions map[string][]string) *generatorConfig {
	return &generatorConfig{
		competenceMap:        matrix,
		competenceExceptions: exceptions,
		validDomainPaths:     testValidDomainPaths(),
	}
}

// fullMatrix returns the valid two-entry matrix used by exception tests.
func fullMatrix() map[string][]string {
	return map[string][]string{
		"Behavioral Health & Social Service Providers|Psychologist": {
			"mental-emotional-health.cognitive-behavioral",
		},
		"Allopathic & Osteopathic Physicians|Internal Medicine": {
			"physical-health.general",
		},
	}
}

func TestValidateCompetenceConfig_validData(t *testing.T) {
	cfg := competenceTestConfig(fullMatrix(), map[string][]string{
		"103T00000X": {"mental-emotional-health.cognitive-behavioral"},
	})
	if err := validateCompetenceConfig(cfg, testValidatorNodes()); err != nil {
		t.Fatalf("valid data rejected: %v", err)
	}
}

func TestValidateCompetenceConfig_missingPair(t *testing.T) {
	matrix := map[string][]string{
		"Behavioral Health & Social Service Providers|Psychologist": {
			"mental-emotional-health.cognitive-behavioral",
		},
	}
	err := validateCompetenceConfig(competenceTestConfig(matrix, nil), testValidatorNodes())
	if err == nil {
		t.Fatal("expected error for missing classification")
	}
	if !strings.Contains(err.Error(), "Allopathic & Osteopathic Physicians|Internal Medicine") {
		t.Errorf("error should name the missing classification, got: %v", err)
	}
}

func TestValidateCompetenceConfig_staleKey(t *testing.T) {
	matrix := fullMatrix()
	matrix["Ghost & Co|Phantom"] = []string{"physical-health.general"}
	err := validateCompetenceConfig(competenceTestConfig(matrix, nil), testValidatorNodes())
	if err == nil {
		t.Fatal("expected error for stale matrix key")
	}
	if !strings.Contains(err.Error(), "Ghost & Co|Phantom") {
		t.Errorf("error should name the stale key, got: %v", err)
	}
}

func TestValidateCompetenceConfig_invalidPath(t *testing.T) {
	matrix := fullMatrix()
	matrix["Behavioral Health & Social Service Providers|Psychologist"] = []string{
		"mental-emotional-health.cognitive-behavioral",
		"physical-health.does-not-exist",
	}
	err := validateCompetenceConfig(competenceTestConfig(matrix, nil), testValidatorNodes())
	if err == nil {
		t.Fatal("expected error for unknown path")
	}
	if !strings.Contains(err.Error(), "does-not-exist") {
		t.Errorf("error should name the unknown path, got: %v", err)
	}
}

func TestValidateCompetenceConfig_emptyList(t *testing.T) {
	matrix := fullMatrix()
	matrix["Behavioral Health & Social Service Providers|Psychologist"] = []string{}
	err := validateCompetenceConfig(competenceTestConfig(matrix, nil), testValidatorNodes())
	if err == nil {
		t.Fatal("expected error for empty competence list")
	}
}

func TestValidateCompetenceConfig_duplicatePath(t *testing.T) {
	matrix := fullMatrix()
	matrix["Behavioral Health & Social Service Providers|Psychologist"] = []string{
		"mental-emotional-health.cognitive-behavioral",
		"mental-emotional-health.cognitive-behavioral",
	}
	err := validateCompetenceConfig(competenceTestConfig(matrix, nil), testValidatorNodes())
	if err == nil {
		t.Fatal("expected error for duplicate path")
	}
}

func TestValidateCompetenceConfig_exceptionUnknownCode(t *testing.T) {
	exceptions := map[string][]string{"000000000X": {"physical-health.general"}}
	err := validateCompetenceConfig(competenceTestConfig(fullMatrix(), exceptions), testValidatorNodes())
	if err == nil {
		t.Fatal("expected error for unknown exception code")
	}
	if !strings.Contains(err.Error(), "000000000X") {
		t.Errorf("error should name the stale exception code, got: %v", err)
	}
}

func TestValidateCompetenceConfig_exceptionInvalidPath(t *testing.T) {
	exceptions := map[string][]string{"103T00000X": {"physical-health.ghost"}}
	err := validateCompetenceConfig(competenceTestConfig(fullMatrix(), exceptions), testValidatorNodes())
	if err == nil {
		t.Fatal("expected error for invalid exception path")
	}
}

func TestValidateCompetenceConfig_exceptionEmptyList(t *testing.T) {
	exceptions := map[string][]string{"103T00000X": {}}
	err := validateCompetenceConfig(competenceTestConfig(fullMatrix(), exceptions), testValidatorNodes())
	if err == nil {
		t.Fatal("expected error for empty exception override")
	}
}

func TestValidateCompetenceConfig_absentExceptionsPass(t *testing.T) {
	// A nil exceptions map is legal (absent file): only matrix checks apply.
	if err := validateCompetenceConfig(competenceTestConfig(fullMatrix(), nil), testValidatorNodes()); err != nil {
		t.Fatalf("absent exceptions should pass: %v", err)
	}
}

func TestValidateCompetenceConfig_aggregatesViolations(t *testing.T) {
	// Missing pair + invalid path in one matrix surface in one sorted error.
	matrix := map[string][]string{
		"Behavioral Health & Social Service Providers|Psychologist": {
			"mental-emotional-health.cognitive-behavioral",
			"social-health-relationships.ghost",
		},
	}
	err := validateCompetenceConfig(competenceTestConfig(matrix, nil), testValidatorNodes())
	if err == nil {
		t.Fatal("expected aggregated error")
	}
	for _, want := range []string{
		"Allopathic & Osteopathic Physicians|Internal Medicine",
		"social-health-relationships.ghost",
	} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("aggregated error should mention %q, got: %v", want, err)
		}
	}
}