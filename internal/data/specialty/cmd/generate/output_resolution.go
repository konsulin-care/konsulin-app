package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// indexDataJSON is the persisted shape of the go:embed runtime index.
type indexDataJSON struct {
	GeneratedAt string                          `json:"generatedAt"`
	Specialties map[string]*SpecialtyNodeOutput `json:"specialties"`
	ByKeyword   map[string][]string             `json:"byKeyword"`
	Resolutions map[string]ResolutionNode       `json:"resolutions"`
}

// goIndexPath returns the destination of the go:embed index file.
func goIndexPath() string {
	if fromPackageDir() {
		return goIndexFileName
	}
	return filepath.Join("internal", "data", "specialty", goIndexFileName)
}

// writeGoIndexJSON persists the direct index, keyword inverted index, and
// interview resolution map as JSON consumed by the runtime package (embedded
// via go:embed in index.go).
func writeGoIndexJSON(data *OutputData) error {
	payload := indexDataJSON{
		GeneratedAt: data.GeneratedAt,
		Specialties: data.Index,
		ByKeyword:   data.InvertedIndex,
		Resolutions: data.Resolutions,
	}
	raw, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling index data: %w", err)
	}
	// nolint:gosec // G306: generated index file must stay group-readable
	return os.WriteFile(goIndexPath(), raw, 0644)
}

// trimmedFloat renders a score without trailing zero fractions (1 not 1.000000)
// so eslint's no-zero-fractions rule is satisfied.
func trimmedFloat(score float64) string {
	if score == float64(int64(score)) {
		return fmt.Sprintf("%d", int64(score))
	}
	s := fmt.Sprintf("%.6f", score)
	return strings.TrimRight(strings.TrimRight(s, "0"), ".")
}

func tsResolutionPath() string {
	if fromPackageDir() {
		return "../../../src/data/specialty-resolution.ts"
	}
	return filepath.Join("src", "data", "specialty-resolution.ts")
}

// writeSpecialtyResolutionTS emits the frontend complaint->NUCC resolution
// map plus the full NUCC label map, consumed by the interview resolver.
func writeSpecialtyResolutionTS(data *OutputData) error {
	var b strings.Builder
	fmt.Fprintf(&b, "// Code generated; DO NOT EDIT.\n")
	fmt.Fprintf(&b, "// Generated at: %s\n", data.GeneratedAt)
	fmt.Fprintf(&b, "/* eslint-disable max-lines */\n\n")
	fmt.Fprintf(&b, "export interface SpecialtyResolution {\n")
	fmt.Fprintf(&b, "  nuccCode: string;\n")
	fmt.Fprintf(&b, "  label: string;\n")
	fmt.Fprintf(&b, "  score: number;\n}\n\n")

	ids := make([]string, 0, len(data.Resolutions))
	for id := range data.Resolutions {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	fmt.Fprintf(&b, "export const SPECIALTY_RESOLUTIONS: Record<string, SpecialtyResolution> = {\n")
	for _, id := range ids {
		r := data.Resolutions[id]
		fmt.Fprintf(&b, "  %q: { nuccCode: %q, label: %q, score: %s },\n",
			id, r.NuccCode, r.Label, trimmedFloat(r.Score))
	}
	fmt.Fprintf(&b, "};\n\n")

	codes := make([]string, 0, len(data.Index))
	for code := range data.Index {
		codes = append(codes, code)
	}
	sort.Strings(codes)
	fmt.Fprintf(&b, "export const SPECIALTY_LABELS: Record<string, string> = {\n")
	for _, code := range codes {
		fmt.Fprintf(&b, "  %q: %q,\n", code, data.Index[code].Label)
	}
	fmt.Fprintf(&b, "};\n")

	path := tsResolutionPath()
	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		return fmt.Errorf("creating resolution dir: %w", err)
	}
	// nolint:gosec // G306: generated resolution file must stay group-readable
	return os.WriteFile(path, []byte(b.String()), 0644)
}