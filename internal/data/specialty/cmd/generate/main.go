package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	// Detect if we're running from package directory or project root
	// by checking for the config directory
	configDir := "config"
	cache := ".cache"
	if _, err := os.Stat(configDir); os.IsNotExist(err) {
		// Not in package directory, try project root
		configDir = "internal/data/specialty/config"
		cache = "internal/data/specialty/.cache"
	}

	// Download sources
	fmt.Println("Downloading sources...")
	if err := downloadSources(cache); err != nil {
		return fmt.Errorf("downloading sources: %w", err)
	}

	// Load stop words
	stopWords, err := loadJSON[[]string](filepath.Join(configDir, "stop-words.json"))
	if err != nil {
		return fmt.Errorf("loading stop words: %w", err)
	}
	stopWordSet := make(map[string]bool)
	for _, w := range stopWords {
		stopWordSet[w] = true
	}

	// Load keyword map
	keywordMap, err := loadJSON[map[string]string](filepath.Join(configDir, "keyword-map.json"))
	if err != nil {
		return fmt.Errorf("loading keyword map: %w", err)
	}

	// Parse ISCO-08
	fmt.Println("Parsing ISCO-08...")
	iscoData, err := loadJSON[map[string]any](filepath.Join(cache, "isco-08.json"))
	if err != nil {
		return fmt.Errorf("loading ISCO-08: %w", err)
	}
	iscoNodes, err := parseISCO(iscoData)
	if err != nil {
		return fmt.Errorf("parsing ISCO-08: %w", err)
	}
	fmt.Printf("Parsed %d ISCO-08 codes\n", len(iscoNodes))

	// Parse NUCC
	fmt.Println("Parsing NUCC taxonomy...")
	nuccData, err := os.ReadFile(filepath.Join(cache, "nucc-taxonomy.csv"))
	if err != nil {
		return fmt.Errorf("reading NUCC taxonomy: %w", err)
	}
	nuccNodes, err := parseNUCC(nuccData)
	if err != nil {
		return fmt.Errorf("parsing NUCC taxonomy: %w", err)
	}
	fmt.Printf("Parsed %d provider-level NUCC codes\n", len(nuccNodes))

	// Build ISCO mapping (simplified - in production would parse from NUCC definitions)
	nuccToIsco := make(map[string]string)
	for code := range nuccNodes {
		// For now, use a simple mapping based on code prefix
		// In production, this would be derived from the data
		nuccToIsco[code] = "2211" // Default to general practice
	}

	// Extract keywords
	fmt.Println("Extracting keywords...")
	definitions := make(map[string]string)
	for code, node := range nuccNodes {
		definitions[code] = node.Definition
	}
	keywords := extractKeywords(definitions, stopWordSet, 3)
	fmt.Printf("Extracted keywords for %d codes\n", len(keywords))

	// Compute domain signatures
	fmt.Println("Computing domain signatures...")
	domainSignatures := computeDomainSignatures(keywords, keywordMap)
	fmt.Printf("Computed domain signatures for %d codes\n", len(domainSignatures))

	// Compute proximity
	fmt.Println("Computing proximity...")
	proximity := computeProximity(iscoNodes, nuccNodes, nuccToIsco, domainSignatures)
	fmt.Printf("Computed proximity for %d codes\n", len(proximity))

	// Build indexes
	fmt.Println("Building indexes...")
	invertedIndex := buildInvertedIndex(keywords)
	directIndex := buildDirectIndex(nuccNodes, nuccToIsco, domainSignatures)
	fmt.Printf("Built inverted index with %d keywords\n", len(invertedIndex))
	fmt.Printf("Built direct index with %d codes\n", len(directIndex))

	// Write output
	fmt.Println("Writing output...")
	data := &OutputData{
		GeneratedAt: now(),
		Proximity:   proximity,
	}
	if err := writeOutput(data); err != nil {
		return fmt.Errorf("writing output: %w", err)
	}

	fmt.Println("Done!")
	return nil
}

func loadJSON[T any](path string) (T, error) {
	var result T
	// nolint:gosec // G304: paths are fixed repo-relative config/cache files
	data, err := os.ReadFile(path)
	if err != nil {
		return result, err
	}
	err = json.Unmarshal(data, &result)
	return result, err
}
