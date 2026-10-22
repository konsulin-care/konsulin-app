package main

import (
	"os"
	"strings"
	"testing"

	"github.com/konsulin-care/konsulin-app/internal/data/wilayah"
)

func TestFormatProvinceLiterals(t *testing.T) {
	provinces := []wilayah.Province{
		{ID: "11", Name: "ACEH"},
		{ID: "12", Name: "SUMATERA UTARA"},
	}
	out := formatProvinceLiterals(provinces)
	if !strings.Contains(out, `{ID: "11", Name: "ACEH"}`) {
		t.Errorf("expected province literal, got: %s", out)
	}
	if !strings.Contains(out, `{ID: "12", Name: "SUMATERA UTARA"}`) {
		t.Errorf("expected second province literal, got: %s", out)
	}
}

func TestFormatStringIntMap(t *testing.T) {
	m := map[string]int{"11": 0, "12": 1}
	out := formatStringIntMap(m)
	if !strings.Contains(out, `"11": 0`) {
		t.Errorf("expected key 11, got: %s", out)
	}
	if !strings.Contains(out, `"12": 1`) {
		t.Errorf("expected key 12, got: %s", out)
	}
}

func TestFormatStringIntSliceMap(t *testing.T) {
	m := map[string][]int{"11": {0, 1}}
	out := formatStringIntSliceMap(m)
	if !strings.Contains(out, `"11": {0, 1}`) {
		t.Errorf("expected slice literal, got: %s", out)
	}
}

func TestWriteDataFileOutput(t *testing.T) {
	idx := wilayah.BuildIndexes(
		[]wilayah.Province{{ID: "11", Name: "ACEH"}},
		[]wilayah.Regency{{ID: "1101", Name: "KABUPATEN ACEH SELATAN", ProvinceID: "11"}},
		[]wilayah.District{{ID: "110101", Name: "BAKONGAN", RegencyID: "1101"}},
		[]wilayah.Village{{ID: "1101012001", Name: "KEUDE BAKONGAN", DistrictID: "110101"}},
	)

	tmpDir := t.TempDir()
	origPath := outputPath
	t.Cleanup(func() {
		outputPath = origPath
	})
	outputPath = tmpDir + "/data.go"

	if err := writeDataFile(idx); err != nil {
		t.Fatalf("writeDataFile failed: %v", err)
	}

	content, err := os.ReadFile(tmpDir + "/data.go")
	if err != nil {
		t.Fatalf("failed to read output: %v", err)
	}

	if !strings.Contains(string(content), `package wilayah`) {
		t.Error("output should contain package declaration")
	}
	if !strings.Contains(string(content), `var WilayahData = WilayahIndex{`) {
		t.Error("output should contain variable declaration")
	}
	if !strings.Contains(string(content), `"11": 0`) {
		t.Error("output should contain map entries")
	}
}

func TestWriteDataFileEmptyIndex(t *testing.T) {
	// Verifies that the formatting functions work with empty/nil data
	idx := wilayah.WilayahIndex{}

	tmpDir := t.TempDir()
	origPath := outputPath
	t.Cleanup(func() {
		outputPath = origPath
	})
	outputPath = tmpDir + "/data.go"

	if err := writeDataFile(idx); err != nil {
		t.Fatalf("writeDataFile with empty index failed: %v", err)
	}

	content, err := os.ReadFile(outputPath)
	if err != nil {
		t.Fatalf("failed to read output: %v", err)
	}

	// Nil maps and slices should render as empty
	if !strings.Contains(string(content), `RegencyByID: map[string]int{`) {
		t.Error("output should contain empty map")
	}
}
