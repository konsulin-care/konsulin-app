package specialty

import (
	"testing"
)

func TestMatchSpecialty_ExactMatch(t *testing.T) {
	idx := &SpecialtyIndex{
		ByKeyword: map[string][]string{
			"psychiatry": {"2084P0800X"},
			"psychology": {"103G00000X"},
		},
		ByNuccCode: map[string]*SpecialtyNode{
			"2084P0800X": {
				NuccCode: "2084P0800X",
				Label:    "Psychiatry",
			},
			"103G00000X": {
				NuccCode: "103G00000X",
				Label:    "Clinical Psychologist",
			},
		},
	}

	matches := MatchSpecialty("psychiatry", idx)

	if len(matches) != 1 {
		t.Fatalf("expected 1 match, got %d", len(matches))
	}
	if matches[0].NuccCode != "2084P0800X" {
		t.Errorf("expected '2084P0800X', got '%s'", matches[0].NuccCode)
	}
}

func TestMatchSpecialty_PartialMatch(t *testing.T) {
	idx := &SpecialtyIndex{
		ByKeyword: map[string][]string{
			"family":   {"207Q00000X"},
			"medicine": {"207Q00000X", "2084P0800X"},
			"therapy":  {"103G00000X"},
		},
		ByNuccCode: map[string]*SpecialtyNode{
			"207Q00000X": {
				NuccCode: "207Q00000X",
				Label:    "Family Medicine",
			},
			"2084P0800X": {
				NuccCode: "2084P0800X",
				Label:    "Psychiatry",
			},
			"103G00000X": {
				NuccCode: "103G00000X",
				Label:    "Clinical Psychologist",
			},
		},
	}

	matches := MatchSpecialty("family medicine", idx)

	// Should match Family Medicine (family + medicine) and Psychiatry (medicine)
	if len(matches) < 1 {
		t.Fatalf("expected at least 1 match, got %d", len(matches))
	}

	// Family Medicine should be first (higher score)
	if matches[0].NuccCode != "207Q00000X" {
		t.Errorf("expected '207Q00000X' first, got '%s'", matches[0].NuccCode)
	}
}

func TestMatchSpecialty_NoMatch(t *testing.T) {
	idx := &SpecialtyIndex{
		ByKeyword: map[string][]string{
			"psychiatry": {"2084P0800X"},
		},
		ByNuccCode: map[string]*SpecialtyNode{
			"2084P0800X": {
				NuccCode: "2084P0800X",
				Label:    "Psychiatry",
			},
		},
	}

	matches := MatchSpecialty("xyz123", idx)

	if len(matches) != 0 {
		t.Errorf("expected 0 matches, got %d", len(matches))
	}
}

func TestMatchSpecialty_ThresholdFiltering(t *testing.T) {
	idx := &SpecialtyIndex{
		ByKeyword: map[string][]string{
			"rare": {"2084P0800X"},
		},
		ByNuccCode: map[string]*SpecialtyNode{
			"2084P0800X": {
				NuccCode: "2084P0800X",
				Label:    "Psychiatry",
			},
		},
	}

	// "rare therapy" should not match well
	matches := MatchSpecialty("rare therapy", idx)

	// Should filter out low-scoring matches
	for _, m := range matches {
		if m.Score < 0.4 {
			t.Errorf("expected score >= 0.4, got %f", m.Score)
		}
	}
}
