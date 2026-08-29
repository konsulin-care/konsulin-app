package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// testResolutionData returns an OutputData carrying index + resolution data.
func testResolutionData() *OutputData {
	return &OutputData{
		GeneratedAt: "2024-01-01T00:00:00Z",
		Index: map[string]*SpecialtyNodeOutput{
			"207Q00000X": {
				NuccCode:        "207Q00000X",
				IscoCode:        "2211",
				Label:           "Family Medicine Physician",
				DomainSignature: []string{"physical-health.general"},
			},
			"2084P0800X": {
				NuccCode:        "2084P0800X",
				IscoCode:        "2212",
				Label:           "Psychiatry Physician",
				DomainSignature: []string{"mental-emotional-health.general"},
			},
		},
		InvertedIndex: map[string][]string{
			"family":     {"207Q00000X"},
			"psychiatry": {"2084P0800X"},
		},
		Resolutions: map[string]ResolutionNode{
			"pain-musculoskeletal": {NuccCode: "207X00000X", Label: "Orthopaedic Surgery Physician", Score: 0.633},
			"other-physical":       {NuccCode: "208D00000X", Label: "General Practice Physician", Score: 1.0},
		},
	}
}

func TestWriteGoIndexJSONFromPackageDir(t *testing.T) {
	root := t.TempDir()
	pkgDir := filepath.Join(root, "internal", "data", "specialty")
	mustMkdirAll(t, filepath.Join(pkgDir, "config"))

	chdir(t, pkgDir)

	if err := writeGoIndexJSON(testResolutionData()); err != nil {
		t.Fatalf("writeGoIndexJSON: %v", err)
	}
	assertFileExists(t, goIndexFileName)

	var idx struct {
		Specialties map[string]*SpecialtyNodeOutput `json:"specialties"`
		ByKeyword   map[string][]string             `json:"byKeyword"`
		Resolutions map[string]struct {
			NuccCode string  `json:"nuccCode"`
			Label    string  `json:"label"`
			Score    float64 `json:"score"`
		} `json:"resolutions"`
	}
	raw, err := os.ReadFile(goIndexFileName)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(raw, &idx); err != nil {
		t.Fatalf("index_data.json not parseable: %v", err)
	}
	if idx.Specialties["207Q00000X"].IscoCode != "2211" {
		t.Errorf("expected iscoCode 2211, got %q", idx.Specialties["207Q00000X"].IscoCode)
	}
	if codes := idx.ByKeyword["psychiatry"]; len(codes) != 1 || codes[0] != "2084P0800X" {
		t.Errorf("unexpected byKeyword entry: %v", codes)
	}
	if r := idx.Resolutions["pain-musculoskeletal"]; r.NuccCode != "207X00000X" {
		t.Errorf("expected resolution 207X00000X, got %q", r.NuccCode)
	}
}

func TestWriteGoIndexJSONFromRootDir(t *testing.T) {
	root := t.TempDir()
	mustMkdirAll(t, filepath.Join(root, "internal", "data", "specialty"))

	chdir(t, root)

	if err := writeGoIndexJSON(testResolutionData()); err != nil {
		t.Fatalf("writeGoIndexJSON: %v", err)
	}
	assertFileExists(t, filepath.Join("internal", "data", "specialty", goIndexFileName))
}

func TestWriteSpecialtyResolutionTSFromRootDir(t *testing.T) {
	root := t.TempDir()
	mustMkdirAll(t, filepath.Join(root, "src", "data"))

	chdir(t, root)

	if err := writeSpecialtyResolutionTS(testResolutionData()); err != nil {
		t.Fatalf("writeSpecialtyResolutionTS: %v", err)
	}
	path := filepath.Join("src", "data", "specialty-resolution.ts")
	assertFileExists(t, path)

	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	text := string(content)
	for _, want := range []string{
		"pain-musculoskeletal", "207X00000X", "Orthopaedic Surgery Physician",
		"2084P0800X", "SPECIALTY_LABELS",
	} {
		if !strings.Contains(text, want) {
			t.Errorf("specialty-resolution.ts missing %q", want)
		}
	}
}

func TestWriteSpecialtyResolutionTSFromPackageDir(t *testing.T) {
	root := t.TempDir()
	pkgDir := filepath.Join(root, "internal", "data", "specialty")
	mustMkdirAll(t, filepath.Join(pkgDir, "config"))
	mustMkdirAll(t, filepath.Join(root, "src", "data"))

	chdir(t, pkgDir)

	if err := writeSpecialtyResolutionTS(testResolutionData()); err != nil {
		t.Fatalf("writeSpecialtyResolutionTS: %v", err)
	}
	// go generate sets cwd to the package dir; the TS file must land at the
	// project root src/data, three levels up.
	assertFileExists(t, filepath.Join(root, "src", "data", "specialty-resolution.ts"))
}
