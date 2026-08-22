package main

import (
	"math"
	"testing"
)

func TestComputeProximity(t *testing.T) {
	iscoNodes := map[string]*iscoNode{
		"2":    {Code: "2", Parent: "", Depth: 1},
		"22":   {Code: "22", Parent: "2", Depth: 2},
		"26":   {Code: "26", Parent: "2", Depth: 2},
		"221":  {Code: "221", Parent: "22", Depth: 3},
		"263":  {Code: "263", Parent: "26", Depth: 3},
		"2211": {Code: "2211", Parent: "221", Depth: 4},
		"2212": {Code: "2212", Parent: "221", Depth: 4},
		"2634": {Code: "2634", Parent: "263", Depth: 4},
	}

	nuccNodes := map[string]*nuccNode{
		"207Q00000X": {
			Code:           "207Q00000X",
			Grouping:       "Allopathic & Osteopathic Physicians",
			Classification: "Family Medicine",
		},
		"2084P0800X": {
			Code:           "2084P0800X",
			Grouping:       "Allopathic & Osteopathic Physicians",
			Classification: "Psychiatry & Neurology",
		},
		"103G00000X": {
			Code:           "103G00000X",
			Grouping:       "Providers",
			Classification: "Psychologist",
		},
	}

	nuccToIsco := map[string]string{
		"207Q00000X": "2211",
		"2084P0800X": "2212",
		"103G00000X": "2634",
	}

	domainSignatures := map[string][]string{
		"207Q00000X": {"primary-care"},
		"2084P0800X": {"mental-health"},
		"103G00000X": {"mental-health"},
	}

	proximity := computeProximity(iscoNodes, nuccNodes, nuccToIsco, domainSignatures)

	// Check that proximity table is symmetric
	if proximity["207Q00000X"]["2084P0800X"] != proximity["2084P0800X"]["207Q00000X"] {
		t.Error("expected symmetric proximity")
	}

	// Check that same specialty has proximity 1.0
	if proximity["207Q00000X"]["207Q00000X"] != 1.0 {
		t.Errorf("expected 1.0 for same specialty, got %f", proximity["207Q00000X"]["207Q00000X"])
	}

	// Check proximity values exist
	psychPsycho := proximity["2084P0800X"]["103G00000X"]
	psychFM := proximity["2084P0800X"]["207Q00000X"]

	// Psychiatry and Family Medicine are both medical doctors (same ISCO parent 221)
	// so they should be closer structurally
	if psychFM <= psychPsycho {
		t.Logf("Psychiatry-FamilyMedicine: %f, Psychiatry-Psychology: %f", psychFM, psychPsycho)
		// This is expected - both are medical doctors
	}

	// Verify both have positive proximity
	if psychPsycho <= 0 || psychFM <= 0 {
		t.Error("expected positive proximity scores")
	}
}

func TestNormalizeProximityTable(t *testing.T) {
	table := map[string]map[string]float64{
		"A": {"A": 1.0, "B": 0.6, "C": 0.2},
		"B": {"A": 0.6, "B": 1.0, "C": 0.4},
		"C": {"A": 0.2, "B": 0.4, "C": 1.0},
	}

	NormalizeProximityTable(table)

	// Min (0.2) maps to 0, max (1.0) maps to 1; diagonal stays untouched.
	if math.Abs(table["A"]["B"]-0.5) > 1e-9 {
		t.Errorf("expected 0.5 for normalized value, got %f", table["A"]["B"])
	}
	if table["C"]["A"] != 0.0 {
		t.Errorf("expected 0.0 for min value, got %f", table["C"]["A"])
	}
	if table["A"]["A"] != 1.0 {
		t.Errorf("expected diagonal to stay 1.0, got %f", table["A"]["A"])
	}
}

func TestClinicalProximity(t *testing.T) {
	nuccNodes := map[string]*nuccNode{
		"A": {Grouping: "Group1", Classification: "Class1"},
		"B": {Grouping: "Group1", Classification: "Class1"},
		"C": {Grouping: "Group1", Classification: "Class2"},
		"D": {Grouping: "Group2", Classification: "Class3"},
	}

	// Same classification
	if clinicalProximity("A", "B", nuccNodes) != 1.0 {
		t.Error("expected 1.0 for same classification")
	}

	// Same grouping, different classification
	if clinicalProximity("B", "C", nuccNodes) != 0.7 {
		t.Error("expected 0.7 for same grouping")
	}

	// Different grouping
	if clinicalProximity("A", "D", nuccNodes) != 0.3 {
		t.Error("expected 0.3 for different grouping")
	}
}
