package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// generatorConfig bundles every authored configuration file.
type generatorConfig struct {
	stopWords            map[string]bool
	keywordMap           map[string]string
	groupingMap          map[string]string
	iscoSynonyms         map[string]string
	classificationMap    map[string]string
	interviewNodes       map[string]interviewNodeConfig
	domainFallbacks      map[string]string
	competenceMap        map[string][]string
	competenceExceptions map[string][]string

	// validDomainPaths holds every legal ICF path (bare core or
	// core.subdomain) from domains.json, used to validate competence entries.
	validDomainPaths map[string]bool
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	configDir, cache := sourcePaths()

	// Download sources (cached for 24 hours)
	fmt.Println("Downloading sources...")
	if err := downloadSources(cache); err != nil {
		return fmt.Errorf("downloading sources: %w", err)
	}

	cfg, err := loadGeneratorConfig(configDir)
	if err != nil {
		return err
	}

	iscoNodes, nuccNodes, err := parseSources(cache)
	if err != nil {
		return err
	}

	if err := validateCompetenceConfig(cfg, nuccNodes); err != nil {
		return fmt.Errorf("validating competence config: %w", err)
	}

	keywords := refineKeywords(nuccNodes, cfg.stopWords)
	nuccToIsco, domainSignatures, proximity := computePipelineStyles(
		nuccNodes, keywords, iscoNodes, cfg,
	)
	invertedIndex, directIndex := buildSearchIndexes(nuccNodes, keywords, nuccToIsco, domainSignatures)
	resolutions := resolveInterview(
		cfg.interviewNodes, domainSignatures, keywords, directIndex, cfg,
	)

	fmt.Println("Writing output...")
	data := &OutputData{
		GeneratedAt:   now(),
		Proximity:     proximity,
		Index:         directIndex,
		InvertedIndex: invertedIndex,
		Resolutions:   resolutions,
	}
	if err := writeOutput(data); err != nil {
		return fmt.Errorf("writing output: %w", err)
	}

	fmt.Println("Done!")
	return nil
}

// sourcePaths resolves config/cache directories for the generator run.
func sourcePaths() (configDir, cache string) {
	configDir = "config"
	cache = ".cache"
	if _, err := os.Stat(configDir); os.IsNotExist(err) {
		configDir = "internal/data/specialty/config"
		cache = "internal/data/specialty/.cache"
	}
	return configDir, cache
}

// loadGeneratorConfig reads every authored config file into a structure.
func loadGeneratorConfig(configDir string) (*generatorConfig, error) {
	stopWords, err := loadJSON[[]string](filepath.Join(configDir, "stop-words.json"))
	if err != nil {
		return nil, fmt.Errorf("loading stop words: %w", err)
	}
	stopWordSet := make(map[string]bool, len(stopWords))
	for _, w := range stopWords {
		stopWordSet[w] = true
	}

	keywordMap, err := loadJSON[map[string]string](filepath.Join(configDir, "keyword-map.json"))
	if err != nil {
		return nil, fmt.Errorf("loading keyword map: %w", err)
	}
	groupingMap, err := loadJSON[map[string]string](filepath.Join(configDir, "grouping-to-domain.json"))
	if err != nil {
		return nil, fmt.Errorf("loading grouping map: %w", err)
	}
	iscoSynonyms, err := loadJSON[map[string]string](filepath.Join(configDir, "isco-synonyms.json"))
	if err != nil {
		return nil, fmt.Errorf("loading ISCO synonyms: %w", err)
	}
	classificationMap, err := loadJSON[map[string]string](filepath.Join(configDir, "classification-to-isco.json"))
	if err != nil {
		return nil, fmt.Errorf("loading classification-to-isco map: %w", err)
	}
	interviewNodes, err := loadJSON[map[string]interviewNodeConfig](filepath.Join(configDir, "interview-map.json"))
	if err != nil {
		return nil, fmt.Errorf("loading interview map: %w", err)
	}

	type domainConfig struct {
		FallbackNuccCode string                    `json:"fallbackNuccCode"`
		Subdomains       map[string]map[string]any `json:"subdomains"`
	}
	domainsCfg, err := loadJSON[map[string]domainConfig](filepath.Join(configDir, "domains.json"))
	if err != nil {
		return nil, fmt.Errorf("loading domains config: %w", err)
	}
	fallbacks := make(map[string]string, len(domainsCfg))
	validPaths := make(map[string]bool)
	for core, dc := range domainsCfg {
		fallbacks[core] = dc.FallbackNuccCode
		validPaths[core] = true
		for sub := range dc.Subdomains {
			validPaths[core+"."+sub] = true
		}
	}

	competenceMap, err := loadJSON[map[string][]string](filepath.Join(configDir, "specialty-competence.json"))
	if err != nil {
		return nil, fmt.Errorf("loading competence matrix: %w", err)
	}
	competenceExceptions, err := loadJSON[map[string][]string](filepath.Join(configDir, "specialty-competence-exceptions.json"))
	if err != nil {
		// An absent exceptions file is legal: no code-level overrides.
		competenceExceptions = map[string][]string{}
	}

	return &generatorConfig{
		stopWords:            stopWordSet,
		keywordMap:           keywordMap,
		groupingMap:          groupingMap,
		iscoSynonyms:         iscoSynonyms,
		classificationMap:    classificationMap,
		interviewNodes:       interviewNodes,
		domainFallbacks:      fallbacks,
		competenceMap:        competenceMap,
		competenceExceptions: competenceExceptions,
		validDomainPaths:     validPaths,
	}, nil
}

// parseSources loads and parses the cached ISCO-08 and NUCC taxonomies.
func parseSources(cache string) (map[string]*iscoNode, map[string]*nuccNode, error) {
	fmt.Println("Parsing ISCO-08...")
	iscoData, err := loadJSON[map[string]any](filepath.Join(cache, "isco-08.json"))
	if err != nil {
		return nil, nil, fmt.Errorf("loading ISCO-08: %w", err)
	}
	iscoNodes, err := parseISCO(iscoData)
	if err != nil {
		return nil, nil, fmt.Errorf("parsing ISCO-08: %w", err)
	}
	fmt.Printf("Parsed %d ISCO-08 codes\n", len(iscoNodes))

	fmt.Println("Parsing NUCC taxonomy...")
	// nolint:gosec // G304: cache path derives from fixed repo-relative sources
	nuccData, err := os.ReadFile(filepath.Join(cache, "nucc-taxonomy.csv"))
	if err != nil {
		return nil, nil, fmt.Errorf("reading NUCC taxonomy: %w", err)
	}
	nuccNodes, err := parseNUCC(nuccData)
	if err != nil {
		return nil, nil, fmt.Errorf("parsing NUCC taxonomy: %w", err)
	}
	fmt.Printf("Parsed %d provider-level NUCC codes\n", len(nuccNodes))
	return iscoNodes, nuccNodes, nil
}

// refineKeywords extracts the TF-IDF keywords per NUCC code.
func refineKeywords(nuccNodes map[string]*nuccNode, stopWords map[string]bool) map[string][]string {
	fmt.Println("Extracting keywords...")
	definitions := make(map[string]string, len(nuccNodes))
	for code, node := range nuccNodes {
		definitions[code] = node.Definition
	}
	keywords := extractKeywords(definitions, stopWords, 10)
	fmt.Printf("Extracted keywords for %d codes\n", len(keywords))
	return keywords
}

// computePipelineStyles derives the ISCO mapping, domain signatures, and
// normalized proximity table.
func computePipelineStyles(
	nuccNodes map[string]*nuccNode,
	keywords map[string][]string,
	iscoNodes map[string]*iscoNode,
	cfg *generatorConfig,
) (map[string]string, map[string][]string, map[string]map[string]float64) {
	fmt.Println("Mapping NUCC to ISCO-08...")
	nuccToIsco := mapNUCCToISCO(nuccNodes, keywords, iscoNodes, cfg.iscoSynonyms, cfg.classificationMap)
	fmt.Printf("Mapped %d NUCC codes to ISCO\n", len(nuccToIsco))

	fmt.Println("Computing domain signatures...")
	domainSignatures := applyCompetenceSignatures(nuccNodes, cfg.groupingMap, cfg.competenceMap, cfg.competenceExceptions)
	printCompetenceReview(domainSignatures, nuccNodes, cfg.competenceMap)
	fmt.Printf("Computed domain signatures for %d codes\n", len(domainSignatures))

	fmt.Println("Computing proximity...")
	proximity := computeProximity(iscoNodes, nuccNodes, nuccToIsco, domainSignatures)
	NormalizeProximityTable(proximity)
	fmt.Printf("Computed proximity for %d codes\n", len(proximity))
	return nuccToIsco, domainSignatures, proximity
}

// buildSearchIndexes builds the keyword inverted index and the direct index.
func buildSearchIndexes(
	nuccNodes map[string]*nuccNode,
	keywords map[string][]string,
	nuccToIsco map[string]string,
	domainSignatures map[string][]string,
) (map[string][]string, map[string]*SpecialtyNodeOutput) {
	fmt.Println("Building indexes...")
	invertedIndex := buildInvertedIndex(keywords)
	directIndex := buildDirectIndex(nuccNodes, nuccToIsco, domainSignatures)
	fmt.Printf("Built inverted index with %d keywords\n", len(invertedIndex))
	fmt.Printf("Built direct index with %d codes\n", len(directIndex))

	out := make(map[string]*SpecialtyNodeOutput, len(directIndex))
	codeLabels := make(map[string]string, len(directIndex))
	for code, node := range directIndex {
		out[code] = &SpecialtyNodeOutput{
			NuccCode:        node.NuccCode,
			IscoCode:        node.IscoCode,
			Label:           node.Label,
			DomainSignature: node.DomainSignature,
		}
		codeLabels[code] = node.Label
	}
	return invertedIndex, out
}

// resolveInterview maps every interview node to a NUCC code via the ontology.
func resolveInterview(
	nodes map[string]interviewNodeConfig,
	domainSignatures map[string][]string,
	keywords map[string][]string,
	directIndex map[string]*SpecialtyNodeOutput,
	cfg *generatorConfig,
) map[string]ResolutionNode {
	fmt.Println("Resolving interview nodes...")
	codeLabels := make(map[string]string, len(directIndex))
	for code, node := range directIndex {
		codeLabels[code] = node.Label
	}
	resolutions := resolveInterviewNodes(
		nodes, domainSignatures, keywords, codeLabels, cfg.domainFallbacks, cfg.keywordMap,
	)
	fmt.Printf("Resolved %d interview nodes\n", len(resolutions))
	return resolutions
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
