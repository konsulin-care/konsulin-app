package main

import (
	"fmt"
	"sort"
	"strings"
)

// taxonomyPairs returns the set of "Grouping|Classification" keys present in
// the parsed NUCC taxonomy, skipping nodes without a classification. This is
// the pair coverage the competence matrix must match exactly.
func taxonomyPairs(nuccNodes map[string]*nuccNode) map[string]bool {
	out := make(map[string]bool, len(nuccNodes))
	for _, node := range nuccNodes {
		if node.Classification == "" {
			continue
		}
		out[node.Grouping+"|"+node.Classification] = true
	}
	return out
}

// validateCompetenceConfig checks the authored competence matrix and code
// exceptions against the parsed NUCC taxonomy and the domains.json path
// taxonomy, aggregating every violation into one sorted error. Missing and
// stale matrix entries, empty or duplicate path lists, and paths outside the
// domain taxonomy are violations for both configs. An empty or absent
// exceptions map is legal and passes.
func validateCompetenceConfig(cfg *generatorConfig, nuccNodes map[string]*nuccNode) error {
	var problems []string
	problems = append(problems, validateCompetenceMatrix(cfg.competenceMap, nuccNodes, cfg.validDomainPaths)...)
	problems = append(problems, validateCompetenceExceptions(cfg.competenceExceptions, nuccNodes, cfg.validDomainPaths)...)
	if len(problems) == 0 {
		return nil
	}
	sort.Strings(problems)
	return fmt.Errorf("competence config invalid:\n  %s", strings.Join(problems, "\n  "))
}

// validateCompetenceMatrix checks classification-level competence entries:
// full coverage of the taxonomy pairs, no stale keys, and well-formed path
// lists per entry.
func validateCompetenceMatrix(matrix map[string][]string, nuccNodes map[string]*nuccNode, validPaths map[string]bool) []string {
	var problems []string
	pairs := taxonomyPairs(nuccNodes)
	for key, paths := range matrix {
		if !pairs[key] {
			problems = append(problems, fmt.Sprintf("competence entry %q not in nucc taxonomy", key))
		}
		problems = append(problems, validatePathList("classification "+key, paths, validPaths)...)
	}
	for key := range pairs {
		if _, ok := matrix[key]; !ok {
			problems = append(problems, fmt.Sprintf("classification %q has no competence entry", key))
		}
	}
	return problems
}

// validateCompetenceExceptions checks code-level overrides: every code must
// exist in the taxonomy, with well-formed path lists. An empty map passes.
func validateCompetenceExceptions(exceptions map[string][]string, nuccNodes map[string]*nuccNode, validPaths map[string]bool) []string {
	if len(exceptions) == 0 {
		return nil
	}
	var problems []string
	for code, paths := range exceptions {
		if _, ok := nuccNodes[code]; !ok {
			problems = append(problems, fmt.Sprintf("exception code %q not found in nucc taxonomy", code))
		}
		problems = append(problems, validatePathList("exception "+code, paths, validPaths)...)
	}
	return problems
}

// validatePathList checks one competence entry's path list: non-empty,
// duplicate-free, every path a valid domain path (bare core or core.subdomain).
func validatePathList(label string, paths []string, validPaths map[string]bool) []string {
	if len(paths) == 0 {
		return []string{fmt.Sprintf("%s has an empty path list", label)}
	}
	var problems []string
	seen := map[string]bool{}
	for _, p := range paths {
		if seen[p] {
			problems = append(problems, fmt.Sprintf("%s lists duplicate path %q", label, p))
		}
		seen[p] = true
		if !validPaths[p] {
			problems = append(problems, fmt.Sprintf("%s references unknown path %q", label, p))
		}
	}
	return problems
}