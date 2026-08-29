package main

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// nuccTaxonomyFileName is the frontend module emitted by the generator.
const nuccTaxonomyFileName = "nucc-taxonomy.ts"

// tsTaxonomyPath returns the destination of the frontend taxonomy module,
// mirroring tsResolutionPath's package-dir detection.
func tsTaxonomyPath() string {
	if fromPackageDir() {
		return "../../../src/data/" + nuccTaxonomyFileName
	}
	return filepath.Join("src", "data", nuccTaxonomyFileName)
}

// writeNuccTaxonomyTS emits the full Individual-section NUCC taxonomy as a
// frontend module, consumed by the practitioner specialty picker. Entries are
// code-sorted for deterministic output and search ergonomics.
func writeNuccTaxonomyTS(data *OutputData) error {
	var b strings.Builder
	fmt.Fprintf(&b, "// Code generated; DO NOT EDIT.\n")
	fmt.Fprintf(&b, "// Generated at: %s\n", data.GeneratedAt)
	fmt.Fprintf(&b, "/* eslint-disable max-lines */\n\n")
	fmt.Fprintf(&b, "export interface NuccTaxonomyEntry {\n")
	fmt.Fprintf(&b, "  code: string;\n")
	fmt.Fprintf(&b, "  grouping: string;\n")
	fmt.Fprintf(&b, "  classification: string;\n")
	fmt.Fprintf(&b, "  specialization: string;\n")
	fmt.Fprintf(&b, "  label: string;\n}\n\n")
	fmt.Fprintf(&b, "/** Individual-section NUCC taxonomy entries, sorted by code. */\n")
	fmt.Fprintf(&b, "export const NUCC_TAXONOMY: NuccTaxonomyEntry[] = [\n")

	codes := make([]string, 0, len(data.NuccNodes))
	for code := range data.NuccNodes {
		codes = append(codes, code)
	}
	sort.Strings(codes)
	for _, code := range codes {
		n := data.NuccNodes[code]
		fmt.Fprintf(&b, "  { code: %q, grouping: %q, classification: %q, specialization: %q, label: %q },\n",
			n.Code, n.Grouping, n.Classification, n.Specialization, n.DisplayName)
	}
	fmt.Fprintf(&b, "];\n")

	path := tsTaxonomyPath()
	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		return fmt.Errorf("creating taxonomy dir: %w", err)
	}
	// nolint:gosec // G306: generated taxonomy file must stay group-readable
	return os.WriteFile(path, []byte(b.String()), 0644)

}
