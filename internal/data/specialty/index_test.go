package specialty

import (
	"testing"

	"github.com/konsulin-care/konsulin-app/internal/data/specialty/proximity"
)

func TestSpecialtyIndex_LookupByNuccCode(t *testing.T) {
	idx := &SpecialtyIndex{
		ByNuccCode: map[string]*SpecialtyNode{
			"207Q00000X": {
				NuccCode:        "207Q00000X",
				IscoCode:        "2211",
				Label:           "General Practice",
				DomainSignature: []string{"primary-care"},
			},
		},
	}

	node := idx.LookupByNuccCode("207Q00000X")
	if node == nil {
		t.Fatal("expected node to be found")
	}
	if node.Label != "General Practice" {
		t.Errorf("expected Label 'General Practice', got '%s'", node.Label)
	}

	// Test not found
	missing := idx.LookupByNuccCode("nonexistent")
	if missing != nil {
		t.Error("expected nil for nonexistent code")
	}
}

func TestSpecialtyIndex_LookupByKeyword(t *testing.T) {
	idx := &SpecialtyIndex{
		ByKeyword: map[string][]string{
			"primary": {"207Q00000X"},
			"care":    {"207Q00000X", "2084P0800X"},
		},
	}

	codes := idx.LookupByKeyword("primary")
	if len(codes) != 1 {
		t.Errorf("expected 1 code, got %d", len(codes))
	}
	if codes[0] != "207Q00000X" {
		t.Errorf("expected '207Q00000X', got '%s'", codes[0])
	}

	codes = idx.LookupByKeyword("care")
	if len(codes) != 2 {
		t.Errorf("expected 2 codes, got %d", len(codes))
	}

	// Test not found
	codes = idx.LookupByKeyword("nonexistent")
	if len(codes) != 0 {
		t.Errorf("expected 0 codes, got %d", len(codes))
	}
}

func TestSpecialtyIndex_GetProximity(t *testing.T) {
	// Populate the shared Generated map for testing
	proximity.Generated = proximity.Table{
		"2211": {
			"2212": 0.85,
			"2634": 0.45,
		},
		"2212": {
			"2211": 0.85,
		},
	}
	defer func() { proximity.Generated = proximity.Table{} }()

	idx := &SpecialtyIndex{}

	// Test existing proximity
	score := idx.GetProximity("2211", "2212")
	if score != 0.85 {
		t.Errorf("expected 0.85, got %f", score)
	}

	// Test symmetric
	score = idx.GetProximity("2212", "2211")
	if score != 0.85 {
		t.Errorf("expected symmetric 0.85, got %f", score)
	}

	// Test not found (should return 0)
	score = idx.GetProximity("9999", "2211")
	if score != 0 {
		t.Errorf("expected 0 for nonexistent, got %f", score)
	}
}
