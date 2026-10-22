package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestWriteProximityShard(t *testing.T) {
	root := t.TempDir()
	proxDir := filepath.Join(root, "proximity")
	mustMkdirAll(t, proxDir)

	// Test data: 3 codes with known proximity scores
	data := map[string]map[string]float64{
		"207Q00000X": {
			"207Q00000X": 1.0,
			"2084P0800X": 0.42,
			"207RA0002X": 0.35,
		},
		"2084P0800X": {
			"207Q00000X": 0.42,
			"2084P0800X": 1.0,
		},
		"207RA0002X": {
			"207Q00000X": 0.35,
			"207RA0002X": 1.0,
		},
	}

	codes := []string{"207Q00000X", "2084P0800X", "207RA0002X"}

	err := writeProximityShard(proxDir, 0, codes, data)
	if err != nil {
		t.Fatalf("writeProximityShard: %v", err)
	}

	expectedFile := filepath.Join(proxDir, "shard_00.go")
	assertFileExists(t, expectedFile)

	content, err := os.ReadFile(expectedFile)
	if err != nil {
		t.Fatalf("reading shard file: %v", err)
	}

	// Verify package declaration
	if !strings.Contains(string(content), "package proximity") {
		t.Error("shard missing 'package proximity' declaration")
	}

	// Verify init function
	if !strings.Contains(string(content), "func init()") {
		t.Error("shard missing init() function")
	}

	// Verify all codes are present
	for _, code := range codes {
		if !strings.Contains(string(content), code) {
			t.Errorf("shard missing code %s", code)
		}
	}
}

func TestWriteProximityShardFileNaming(t *testing.T) {
	root := t.TempDir()
	proxDir := filepath.Join(root, "proximity")
	mustMkdirAll(t, proxDir)

	data := map[string]map[string]float64{
		"CODE1": {"CODE1": 1.0},
	}

	// Test zero-padded naming
	err := writeProximityShard(proxDir, 0, []string{"CODE1"}, data)
	if err != nil {
		t.Fatalf("writeProximityShard: %v", err)
	}
	assertFileExists(t, filepath.Join(proxDir, "shard_00.go"))

	// Test higher shard number
	err = writeProximityShard(proxDir, 49, []string{"CODE1"}, data)
	if err != nil {
		t.Fatalf("writeProximityShard: %v", err)
	}
	assertFileExists(t, filepath.Join(proxDir, "shard_49.go"))
}

func TestWriteProximityShardEmptyCodes(t *testing.T) {
	root := t.TempDir()
	proxDir := filepath.Join(root, "proximity")
	mustMkdirAll(t, proxDir)

	data := map[string]map[string]float64{}

	err := writeProximityShard(proxDir, 0, []string{}, data)
	if err != nil {
		t.Fatalf("writeProximityShard with empty codes: %v", err)
	}

	// Should still create a valid file
	assertFileExists(t, filepath.Join(proxDir, "shard_00.go"))
}
