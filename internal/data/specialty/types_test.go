package specialty

import (
	"testing"
)

func TestOntologyNode_Fields(t *testing.T) {
	node := OntologyNode{
		Code:    "2211",
		Display: "Generalist Medical Practitioners",
		Parent:  "221",
		Depth:   3,
	}

	if node.Code != "2211" {
		t.Errorf("expected Code '2211', got '%s'", node.Code)
	}
	if node.Display != "Generalist Medical Practitioners" {
		t.Errorf("expected Display 'Generalist Medical Practitioners', got '%s'", node.Display)
	}
	if node.Parent != "221" {
		t.Errorf("expected Parent '221', got '%s'", node.Parent)
	}
	if node.Depth != 3 {
		t.Errorf("expected Depth 3, got %d", node.Depth)
	}
}

func TestSpecialtyNode_Fields(t *testing.T) {
	node := SpecialtyNode{
		NuccCode:        "207Q00000X",
		IscoCode:        "2211",
		Label:           "General Practice",
		DomainSignature: []string{"primary-care", "preventive"},
	}

	if node.NuccCode != "207Q00000X" {
		t.Errorf("expected NuccCode '207Q00000X', got '%s'", node.NuccCode)
	}
	if node.IscoCode != "2211" {
		t.Errorf("expected IscoCode '2211', got '%s'", node.IscoCode)
	}
	if node.Label != "General Practice" {
		t.Errorf("expected Label 'General Practice', got '%s'", node.Label)
	}
	if len(node.DomainSignature) != 2 {
		t.Errorf("expected DomainSignature length 2, got %d", len(node.DomainSignature))
	}
}

func TestSpecialtyMatch_Fields(t *testing.T) {
	match := SpecialtyMatch{
		NuccCode: "207Q00000X",
		Label:    "General Practice",
		Score:    0.85,
		Domains:  []string{"primary-care"},
	}

	if match.NuccCode != "207Q00000X" {
		t.Errorf("expected NuccCode '207Q00000X', got '%s'", match.NuccCode)
	}
	if match.Score != 0.85 {
		t.Errorf("expected Score 0.85, got %f", match.Score)
	}
}

func TestProximityTable_Type(t *testing.T) {
	// Test that ProximityTable can be instantiated
	pt := ProximityTable{
		"2211": {
			"2212": 0.85,
			"2634": 0.45,
		},
	}

	if pt["2211"]["2212"] != 0.85 {
		t.Errorf("expected proximity 0.85, got %f", pt["2211"]["2212"])
	}
}
