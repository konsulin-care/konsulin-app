package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

const (
	iscoURL  = "https://profiles.ihe.net/PCC/ODH/1.0.0/CodeSystem-ISCO08.json"
	nuccURL  = "https://nucc.org/images/stories/CSV/nucc_taxonomy_261.csv"
	cacheAge = 24 * time.Hour
)

// ensureDownload downloads a file if it doesn't exist or is older than maxAge.
func ensureDownload(url, destPath string, maxAge time.Duration) error {
	// Check if file exists and is recent
	if info, err := os.Stat(destPath); err == nil {
		if time.Since(info.ModTime()) < maxAge {
			return nil // File is fresh enough
		}
	}

	// Create cache directory
	dir := filepath.Dir(destPath)
	if err := os.MkdirAll(dir, 0750); err != nil {
		return fmt.Errorf("creating cache dir: %w", err)
	}

	// Download
	// nolint:gosec // G107: URLs are fixed constants defined in this file
	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("downloading %s: %w", url, err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("downloading %s: status %d", url, resp.StatusCode)
	}

	// Write to file
	// nolint:gosec // G304: destPath derives from fixed repo-relative cache paths
	f, err := os.Create(destPath)
	if err != nil {
		return fmt.Errorf("creating file %s: %w", destPath, err)
	}
	defer func() {
		_ = f.Close()
	}()

	if _, err := io.Copy(f, resp.Body); err != nil {
		return fmt.Errorf("writing file %s: %w", destPath, err)
	}

	return nil
}

// downloadSources downloads ISCO-08 and NUCC taxonomy files.
func downloadSources(cacheDir string) error {
	if err := ensureDownload(iscoURL, filepath.Join(cacheDir, "isco-08.json"), cacheAge); err != nil {
		return fmt.Errorf("downloading ISCO-08: %w", err)
	}

	if err := ensureDownload(nuccURL, filepath.Join(cacheDir, "nucc-taxonomy.csv"), cacheAge); err != nil {
		return fmt.Errorf("downloading NUCC taxonomy: %w", err)
	}

	return nil
}
