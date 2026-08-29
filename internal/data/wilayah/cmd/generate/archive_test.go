package main

import (
	"archive/zip"
	"bytes"
	"os"
	"strings"
	"testing"

	"github.com/konsulin-care/konsulin-app/internal/data/wilayah"
)

func TestExtractArchive(t *testing.T) {
	// Create a small in-memory zip archive
	var buf bytes.Buffer
	w := zip.NewWriter(&buf)

	files := map[string]string{
		"api/provinces.json":       `[{"id":"11","name":"ACEH"}]`,
		"api/regencies/11.json":    `[{"id":"1101","name":"KABUPATEN ACEH SELATAN","province_id":"11"}]`,
		"api/districts/1101.json":  `[{"id":"110101","name":"BAKONGAN","regency_id":"1101"}]`,
		"api/villages/110101.json": `[{"id":"1101012001","name":"KEUDE BAKONGAN","district_id":"110101"}]`,
		"api/other.json":           `{"ignored":true}`,
	}
	for name, content := range files {
		f, err := w.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		_, _ = f.Write([]byte(content))
	}
	_ = w.Close()

	result, err := extractArchive(buf.Bytes())
	if err != nil {
		t.Fatalf("extractArchive failed: %v", err)
	}

	// Check extraction found the right files
	tests := []struct {
		path     string
		contains string
	}{
		{"api/provinces.json", "ACEH"},
		{"api/regencies/11.json", "ACEH SELATAN"},
		{"api/districts/1101.json", "BAKONGAN"},
		{"api/villages/110101.json", "KEUDE BAKONGAN"},
	}
	for _, tt := range tests {
		content, ok := result[tt.path]
		if !ok {
			t.Errorf("missing extracted file: %s", tt.path)
			continue
		}
		if !strings.Contains(string(content), tt.contains) {
			t.Errorf("file %s should contain %q, got: %s", tt.path, tt.contains, string(content))
		}
	}
}

func TestExtractArchiveEmpty(t *testing.T) {
	var buf bytes.Buffer
	w := zip.NewWriter(&buf)
	_ = w.Close()

	result, err := extractArchive(buf.Bytes())
	if err != nil {
		t.Fatalf("extractArchive failed: %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty result, got %d files", len(result))
	}
}

func TestParseWilayahFiles(t *testing.T) {
	files := map[string][]byte{
		"api/provinces.json":       []byte(`[{"id":"11","name":"ACEH"},{"id":"12","name":"SUMATERA UTARA"}]`),
		"api/regencies/11.json":    []byte(`[{"id":"1101","name":"KABUPATEN ACEH SELATAN","province_id":"11"}]`),
		"api/regencies/12.json":    []byte(`[{"id":"1201","name":"KABUPATEN TAPANULI TENGAH","province_id":"12"}]`),
		"api/districts/1101.json":  []byte(`[{"id":"110101","name":"BAKONGAN","regency_id":"1101"}]`),
		"api/villages/110101.json": []byte(`[{"id":"1101012001","name":"KEUDE BAKONGAN","district_id":"110101"}]`),
	}

	provinces, regencies, districts, villages, err := parseWilayahFiles(files)
	if err != nil {
		t.Fatalf("parseWilayahFiles failed: %v", err)
	}

	if len(provinces) != 2 {
		t.Errorf("expected 2 provinces, got %d", len(provinces))
	}
	if len(regencies) != 2 {
		t.Errorf("expected 2 regencies, got %d", len(regencies))
	}
	if len(districts) != 1 {
		t.Errorf("expected 1 district, got %d", len(districts))
	}
	if len(villages) != 1 {
		t.Errorf("expected 1 village, got %d", len(villages))
	}
}

func TestParseWilayahFilesMissingProvince(t *testing.T) {
	files := map[string][]byte{
		"api/regencies/11.json": []byte(`[{"id":"1101","name":"KABUPATEN ACEH SELATAN","province_id":"11"}]`),
	}

	_, _, _, _, err := parseWilayahFiles(files)
	if err == nil {
		t.Error("expected error for missing provinces.json")
	}
}

func TestFullPipeline(t *testing.T) {
	// Simulate the full pipeline: zip -> extract -> parse -> BuildIndexes
	// Create a small zip archive with sample wilayah data
	var buf bytes.Buffer
	w := zip.NewWriter(&buf)

	entries := map[string]string{
		"api/provinces.json":       `[{"id":"11","name":"ACEH"}]`,
		"api/regencies/11.json":    `[{"id":"1101","name":"KABUPATEN ACEH SELATAN","province_id":"11"}]`,
		"api/districts/1101.json":  `[{"id":"110101","name":"BAKONGAN","regency_id":"1101"}]`,
		"api/villages/110101.json": `[{"id":"1101012001","name":"KEUDE BAKONGAN","district_id":"110101"}]`,
	}
	for name, content := range entries {
		f, _ := w.Create(name)
		_, _ = f.Write([]byte(content))
	}
	_ = w.Close()

	// Extract
	extracted, err := extractArchive(buf.Bytes())
	if err != nil {
		t.Fatalf("extractArchive failed: %v", err)
	}

	// Parse
	provinces, regencies, districts, villages, err := parseWilayahFiles(extracted)
	if err != nil {
		t.Fatalf("parseWilayahFiles failed: %v", err)
	}

	// Build indexes (uses the existing BuildIndexes function)
	idx := wilayah.BuildIndexes(provinces, regencies, districts, villages)

	// Verify
	if idx.ProvinceByID["11"] != 0 {
		t.Error("expected province 11 at index 0")
	}
	if idx.RegencyByID["1101"] != 0 {
		t.Error("expected regency 1101 at index 0")
	}
	if i, ok := idx.RegenciesByProvince["11"]; !ok || len(i) != 1 {
		t.Error("expected regencies by province 11")
	}

	// Write generated file to temp dir
	tmpDir := t.TempDir()
	origPath := outputPath
	t.Cleanup(func() {
		outputPath = origPath
	})
	outputPath = tmpDir + "/data.go"

	if err := writeDataFile(idx); err != nil {
		t.Fatalf("writeDataFile failed: %v", err)
	}

	// Verify output file is valid Go
	content, err := os.ReadFile(outputPath)
	if err != nil {
		t.Fatalf("failed to read output: %v", err)
	}
	if !strings.Contains(string(content), `var WilayahData = WilayahIndex{`) {
		t.Error("output should contain valid Go variable declaration")
	}
}
