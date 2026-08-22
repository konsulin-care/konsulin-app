package main

import (
	"encoding/csv"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

// loadNuccNodes reads the full NUCC node map from the cached CSV.
func loadNuccNodes(t *testing.T) map[string]*nuccNode {
	t.Helper()
	f, err := os.Open(filepath.Join(packageDir(), "..", "..", ".cache", "nucc-taxonomy.csv"))
	if err != nil {
		t.Fatalf("opening nucc-taxonomy.csv: %v", err)
	}
	defer f.Close()

	rows, err := csv.NewReader(f).ReadAll()
	if err != nil {
		t.Fatalf("reading nucc-taxonomy.csv: %v", err)
	}
	header := rows[0]
	idx := make(map[string]int, len(header))
	for i, col := range header {
		idx[col] = i
	}
	out := make(map[string]*nuccNode)
	for _, row := range rows[1:] {
		if row[idx["Section"]] != "Individual" {
			continue
		}
		code := row[idx["Code"]]
		if code == "" {
			continue
		}
		cell := func(name string) string {
			if col, ok := idx[name]; ok && col < len(row) {
				return row[col]
			}
			return ""
		}
		out[code] = &nuccNode{
			Code:           code,
			Grouping:       cell("Grouping"),
			Classification: cell("Classification"),
			Specialization: cell("Specialization"),
			Definition:     cell("Definition"),
			DisplayName:    cell("Display Name"),
		}
	}
	return out
}

// TestMapNUCCToISCO exercises the ISCO-08 mapping stage over the cached
// corpora and pins the plan's curated expectations:
// psychologist -> 2634, general practice -> 2211, psychiatry -> 2212,
// orthopaedic surgery -> 2212. Every NUCC code must get a non-empty ISCO code
// that exists in the ISCO hierarchy.
func TestMapNUCCToISCO(t *testing.T) {
	nodes := loadNuccNodes(t)
	iscoNodes := loadISCONodes(t)
	synonyms := loadJSONConfig[map[string]string](t, "isco-synonyms.json")
	classificationMap := loadJSONConfig[map[string]string](t, "classification-to-isco.json")
	keywords := extractKeywords(loadNuccDefinitions(t), loadStopWordSet(t), 10)

	mapping := mapNUCCToISCO(nodes, keywords, iscoNodes, synonyms, classificationMap)

	expectations := map[string]string{
		"103T00000X": "2634", // Psychologist
		"103G00000X": "2634", // Clinical Neuropsychologist
		"208D00000X": "2211", // General Practice
		"2084P0800X": "2212", // Psychiatry & Neurology
		"207X00000X": "2212", // Orthopaedic Surgery
	}
	for code, want := range expectations {
		if got := mapping[code]; got != want {
			t.Errorf("mapNUCCToISCO(%s) = %q, want %q", code, got, want)
		}
	}

	if len(mapping) != len(nodes) {
		t.Errorf("expected mapping for all %d codes, got %d", len(nodes), len(mapping))
	}
	for code, isco := range mapping {
		if isco == "" {
			t.Errorf("%s: empty ISCO code", code)
			continue
		}
		if _, exists := iscoNodes[isco]; !exists {
			t.Errorf("%s: ISCO code %q not found in hierarchy", code, isco)
		}
	}
}

// loadISCONodes reads the ISCO-08 node map from the cached JSON.
func loadISCONodes(t *testing.T) map[string]*iscoNode {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(packageDir(), "..", "..", ".cache", "isco-08.json"))
	if err != nil {
		t.Fatalf("reading isco-08.json: %v", err)
	}
	var raw map[string]any
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("parsing isco-08.json: %v", err)
	}
	nodes, err := parseISCO(raw)
	if err != nil {
		t.Fatalf("parsing ISCO-08: %v", err)
	}
	return nodes
}