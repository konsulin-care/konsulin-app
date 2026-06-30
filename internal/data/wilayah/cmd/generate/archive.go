package main

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"path"
	"strings"

	"github.com/konsulin-care/konsulin-app/internal/data/wilayah"
)

// archiveURL is the URL of the repository zip archive.
const archiveURL = "https://github.com/emsifa/api-wilayah-indonesia/archive/refs/heads/master.zip"

// downloadArchive fetches the full repository archive as a zip file.
//
//nolint:gosec // URL is a known constant.
func downloadArchive(url string) ([]byte, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("download %s: %w", url, err)
	}
	//nolint:errcheck // Cleanup-only close.
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}
	return body, nil
}

// extractArchive extracts a zip archive into a map of file path -> content bytes.
func extractArchive(data []byte) (map[string][]byte, error) {
	r, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, fmt.Errorf("open zip: %w", err)
	}

	files := make(map[string][]byte, len(r.File))
	for _, f := range r.File {
		if f.FileInfo().IsDir() {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return nil, fmt.Errorf("open %s in zip: %w", f.Name, err)
		}
		content, err := io.ReadAll(rc)
		_ = rc.Close()
		if err != nil {
			return nil, fmt.Errorf("read %s from zip: %w", f.Name, err)
		}
		files[f.Name] = content
	}
	return files, nil
}

// parseWilayahFiles parses all wilayah JSON files from an extracted map.
func parseWilayahFiles(files map[string][]byte) ([]wilayah.Province, []wilayah.Regency, []wilayah.District, []wilayah.Village, error) {
	var provinces []wilayah.Province
	var regencies []wilayah.Regency
	var districts []wilayah.District
	var villages []wilayah.Village

	for filePath, content := range files {
		base := path.Base(filePath)
		dir := path.Dir(filePath)

		switch {
		case base == "provinces.json":
			if err := json.Unmarshal(content, &provinces); err != nil {
				return nil, nil, nil, nil, fmt.Errorf("parse %s: %w", filePath, err)
			}
		case isJSONInDir(base, dir, "/regencies"):
			regencies = appendParsed(regencies, content)
		case isJSONInDir(base, dir, "/districts"):
			districts = appendParsed(districts, content)
		case isJSONInDir(base, dir, "/villages"):
			villages = appendParsed(villages, content)
		}
	}

	if len(provinces) == 0 {
		return nil, nil, nil, nil, fmt.Errorf("no provinces.json found in archive")
	}

	return provinces, regencies, districts, villages, nil
}

// isJSONInDir checks if a file belongs to a subdirectory with the given suffix.
func isJSONInDir(base, dir, suffix string) bool {
	return strings.HasSuffix(dir, suffix) && strings.HasSuffix(base, ".json")
}

// appendParsed decodes content as a JSON array of wilayah types and appends.
func appendParsed[T any](items []T, content []byte) []T {
	var parsed []T
	if err := json.Unmarshal(content, &parsed); err != nil {
		return items
	}
	return append(items, parsed...)
}

// runGenerate is the core generation logic, extracted from main for testability.
// It downloads, extracts, parses, builds indexes, and writes data.go.
func runGenerate() error {
	log.Println("Downloading archive...")
	zipData, err := downloadArchive(archiveURL)
	if err != nil {
		return fmt.Errorf("download: %w", err)
	}
	log.Printf("Downloaded %d bytes", len(zipData))

	log.Println("Extracting archive...")
	files, err := extractArchive(zipData)
	if err != nil {
		return fmt.Errorf("extract: %w", err)
	}
	log.Printf("Extracted %d files", len(files))

	log.Println("Parsing wilayah data...")
	provinces, regencies, districts, villages, err := parseWilayahFiles(files)
	if err != nil {
		return fmt.Errorf("parse: %w", err)
	}
	log.Printf("Parsed: %d provinces, %d regencies, %d districts, %d villages",
		len(provinces), len(regencies), len(districts), len(villages))

	log.Println("Normalizing names...")
	wilayah.NormalizeAllNames(provinces, regencies, districts, villages)

	log.Println("Building indexes...")
	idx := wilayah.BuildIndexes(provinces, regencies, districts, villages)

	log.Println("Writing data.go...")
	if err := writeDataFile(idx); err != nil {
		return fmt.Errorf("write: %w", err)
	}
	log.Println("Done!")
	return nil
}
