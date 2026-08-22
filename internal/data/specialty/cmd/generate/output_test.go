package main

import (
	"os"
	"path/filepath"
	"testing"
)

// chdir changes the working directory for the test and restores it afterwards.
func chdir(t *testing.T, dir string) {
	t.Helper()
	t.Chdir(dir)
}

func mustMkdirAll(t *testing.T, dir string) {
	t.Helper()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatalf("mkdir %s: %v", dir, err)
	}
}

func assertFileExists(t *testing.T, path string) {
	t.Helper()
	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("expected file %s to exist: %v", path, err)
	}
	if info.IsDir() {
		t.Fatalf("expected %s to be a file, got directory", path)
	}
}

func testOutputData() *OutputData {
	return &OutputData{
		GeneratedAt: "2024-01-01T00:00:00Z",
		Proximity: map[string]map[string]float64{
			"207Q00000X": {"2084P0800X": 0.42},
		},
	}
}

func TestWriteTSOutputFromPackageDir(t *testing.T) {
	root := t.TempDir()
	pkgDir := filepath.Join(root, "internal", "data", "specialty")
	mustMkdirAll(t, filepath.Join(pkgDir, "config"))
	// Project-root src/types exists; package dir deliberately has none.
	mustMkdirAll(t, filepath.Join(root, "src", "types"))

	chdir(t, pkgDir)

	if err := writeTSOutput(testOutputData()); err != nil {
		t.Fatalf("writeTSOutput: %v", err)
	}

	// go generate sets cwd to the package dir, so the TS file must land at
	// the project root, two levels up.
	expected := filepath.Join(root, "src", "types", "specialty-ontology.ts")
	assertFileExists(t, expected)
}

func TestWriteTSOutputFromRootDir(t *testing.T) {
	root := t.TempDir()
	mustMkdirAll(t, filepath.Join(root, "src", "types"))

	chdir(t, root)

	if err := writeTSOutput(testOutputData()); err != nil {
		t.Fatalf("writeTSOutput: %v", err)
	}

	expected := filepath.Join(root, "src", "types", "specialty-ontology.ts")
	assertFileExists(t, expected)
}

func TestWriteProximityShardsFromPackageDir(t *testing.T) {
	root := t.TempDir()
	pkgDir := filepath.Join(root, "internal", "data", "specialty")
	mustMkdirAll(t, filepath.Join(pkgDir, "config"))

	chdir(t, pkgDir)

	if err := writeProximityShards(testOutputData()); err != nil {
		t.Fatalf("writeProximityShards: %v", err)
	}

	// go generate sets cwd to the package dir, so shards must land in the
	// local proximity/ subdirectory.
	expected := filepath.Join(pkgDir, "proximity", "shard_00.go")
	assertFileExists(t, expected)
}

func TestWriteProximityShardsFromRootDir(t *testing.T) {
	root := t.TempDir()
	mustMkdirAll(t, filepath.Join(root, "internal", "data", "specialty"))

	chdir(t, root)

	if err := writeProximityShards(testOutputData()); err != nil {
		t.Fatalf("writeProximityShards: %v", err)
	}

	expected := filepath.Join(root, "internal", "data", "specialty", "proximity", "shard_00.go")
	assertFileExists(t, expected)
}
