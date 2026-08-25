package main

import (
	"testing"
)

// Sample NUCC data for testing
const sampleNUCC = `Code,Grouping,Classification,Specialization,Definition,Notes,Display Name,Section
207Q00000X,Allopathic & Osteopathic Physicians,Family Medicine,,"Family Medicine is the medical specialty which is concerned with the total health care of the individual and the family.",,Family Medicine Physician,Individual
2084P0800X,Allopathic & Osteopathic Physicians,Psychiatry & Neurology,Psychiatry,"A Psychiatrist specializes in the prevention, diagnosis, and treatment of mental, emotional, and behavioral disorders.",,Psychiatry Physician,Individual
193400000X,Group,Single Specialty,,"A business group of one or more individual practitioners.",,Single Specialty Group,Group
103G00000X,Providers,Psychologist, Clinical,"Clinical psychologists assess and treat mental, emotional, and behavioral disorders.",,Clinical Psychologist,Individual`

func TestParseNUCC(t *testing.T) {
	nodes, err := parseNUCC([]byte(sampleNUCC))
	if err != nil {
		t.Fatal(err)
	}

	// Should only include Individual section
	if len(nodes) != 3 {
		t.Errorf("expected 3 individual providers, got %d", len(nodes))
	}

	// Check Family Medicine
	fm, ok := nodes["207Q00000X"]
	if !ok {
		t.Fatal("expected Family Medicine to be found")
	}
	if fm.Grouping != "Allopathic & Osteopathic Physicians" {
		t.Errorf("expected grouping 'Allopathic & Osteopathic Physicians', got '%s'", fm.Grouping)
	}
	if fm.Classification != "Family Medicine" {
		t.Errorf("expected classification 'Family Medicine', got '%s'", fm.Classification)
	}

	// Check that Group section is excluded
	if _, ok := nodes["193400000X"]; ok {
		t.Error("expected Group section to be excluded")
	}
}

func TestNUCCNode_Fields(t *testing.T) {
	node := &nuccNode{
		Code:           "207Q00000X",
		Grouping:       "Allopathic & Osteopathic Physicians",
		Classification: "Family Medicine",
		Specialization: "",
		Definition:     "Family Medicine is the medical specialty...",
		DisplayName:    "Family Medicine Physician",
	}

	if node.Code != "207Q00000X" {
		t.Errorf("expected Code '207Q00000X', got '%s'", node.Code)
	}
	if node.Grouping != "Allopathic & Osteopathic Physicians" {
		t.Errorf("expected Grouping 'Allopathic & Osteopathic Physicians', got '%s'", node.Grouping)
	}
}
