package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// testNuccTaxonomyData returns an OutputData carrying the Individual-section
// NUCC parse consumed by the taxonomy writer tests.
func testNuccTaxonomyData() *OutputData {
	return &OutputData{
		GeneratedAt: "2024-01-01T00:00:00Z",
		NuccNodes: map[string]*nuccNode{
			"2084P0800X": {
				Code:           "2084P0800X",
				Grouping:       "Allopathic & Osteopathic Physicians",
				Classification: "Psychiatry & Neurology",
				Specialization: "Psychiatry",
				DisplayName:    "Psychiatry Physician",
			},
			"103T00000X": {
				Code:           "103T00000X",
				Grouping:       "Behavioral Health & Social Service Providers",
				Classification: "Psychologist",
				Specialization: "",
				DisplayName:    "Psychologist",
			},
		},
	}
}

// assertTaxonomyFile validates the generated module body: header, types,
// expected entries, and deterministic (code-sorted) output.
func assertTaxonomyFile(t *testing.T, path string) {
	t.Helper()
	assertFileExists(t, path)

	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	text := string(content)

	for _, want := range []string{
		"// Code generated; DO NOT EDIT.",
		"export interface NuccTaxonomyEntry {",
		"code: string;",
		"grouping: string;",
		"classification: string;",
		"specialization: string;",
		"label: string;",
		"export const NUCC_TAXONOMY: NuccTaxonomyEntry[] = [",
		"103T00000X",
		"2084P0800X",
		"Psychologist",
		"Psychiatry Physician",
		"Behavioral Health & Social Service Providers",
		"Psychiatry & Neurology",
	} {
		if !strings.Contains(text, want) {
			t.Errorf("nucc-taxonomy.ts missing %q", want)
		}
	}

	if idxFirst := strings.Index(text, "103T00000X"); idxFirst < 0 {
		t.Error("nucc-taxonomy.ts missing first sorted code 103T00000X")
	} else if idxSecond := strings.Index(text, "2084P0800X"); idxSecond < 0 {
		t.Error("nucc-taxonomy.ts missing second sorted code 2084P0800X")
	} else if idxFirst > idxSecond {
		t.Error("nucc-taxonomy.ts entries are not sorted by code")
	}
}

func TestWriteNuccTaxonomyTSFromRootDir(t *testing.T) {
	root := t.TempDir()
	mustMkdirAll(t, filepath.Join(root, "src", "data"))

	chdir(t, root)

	if err := writeNuccTaxonomyTS(testNuccTaxonomyData()); err != nil {
		t.Fatalf("writeNuccTaxonomyTS: %v", err)
	}
	assertTaxonomyFile(t, filepath.Join("src", "data", "nucc-taxonomy.ts"))
}

func TestWriteNuccTaxonomyTSFromPackageDir(t *testing.T) {
	root := t.TempDir()
	pkgDir := filepath.Join(root, "internal", "data", "specialty")
	mustMkdirAll(t, filepath.Join(pkgDir, "config"))
	mustMkdirAll(t, filepath.Join(root, "src", "data"))

	chdir(t, pkgDir)

	if err := writeNuccTaxonomyTS(testNuccTaxonomyData()); err != nil {
		t.Fatalf("writeNuccTaxonomyTS: %v", err)
	}
	// go generate sets cwd to the package dir; the TS file must land at the
	// project root src/data, three levels up.
	assertTaxonomyFile(t, filepath.Join(root, "src", "data", "nucc-taxonomy.ts"))

}
