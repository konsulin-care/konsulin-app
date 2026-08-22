package main

import (
	"sort"
	"strings"
)

// interviewNodeConfig is one chief-complaint feature vector from
// config/interview-map.json.
type interviewNodeConfig struct {
	IcfDomain string   `json:"icfDomain"`
	Keywords  []string `json:"keywords"`
}

// ResolutionNode is the ontology resolution of one interview node.
type ResolutionNode struct {
	NuccCode string
	Label    string
	Score    float64
}

// complaintDomainSet resolves the complaint's keywords into a set of domain
// paths in the shared signature space. The bare ICF core is intentionally not
// included: bare cores overlap any code in the domain and blur specificity;
// keyword-derived paths carry the discriminating power.
func complaintDomainSet(node interviewNodeConfig, keywordMap map[string]string) []string {
	set := map[string]bool{}
	for _, kw := range node.Keywords {
		if path, ok := keywordMap[kw]; ok {
			set[path] = true
		}
	}
	out := make([]string, 0, len(set))
	for p := range set {
		out = append(out, p)
	}
	sort.Strings(out)
	return out
}

// stemmedJaccard computes Jaccard similarity over singularized token sets so
// plural and derived spellings (illness/illnesses, behavior/behavioral) match.
func stemmedJaccard(a, b []string) float64 {
	setA := make(map[string]bool, len(a))
	for _, t := range a {
		setA[singularize(t)] = true
	}
	setB := make(map[string]bool, len(b))
	for _, t := range b {
		setB[singularize(t)] = true
	}
	inter := 0
	for tok := range setA {
		if setB[tok] {
			inter++
		}
	}
	union := len(setA) + len(setB) - inter
	if union == 0 {
		return 0
	}
	return float64(inter) / float64(union)
}

// bestMatchingCode picks the NUCC code with the highest weighted Jaccard
// score against a complaint's domains and keywords:
//
//	score = 0.5 * jaccard(domains) + 0.5 * jaccard(keywords)
//
// Codes are scanned in sorted order so ties resolve deterministically. When
// the best score is zero the empty string is returned.
func bestMatchingCode(
	complaintDomains, complaintKeywords []string,
	codeSignatures map[string][]string,
	codeKeywords map[string][]string,
) (string, float64) {
	best := ""
	bestScore := 0.0
	for _, code := range sortedCodeKeys(codeSignatures) {
		score := 0.5*jaccardSimilarity(complaintDomains, codeSignatures[code]) +
			0.5*stemmedJaccard(complaintKeywords, codeKeywords[code])
		if score > bestScore {
			best = code
			bestScore = score
		}
	}
	return best, bestScore
}

// resolveInterviewNodes maps every interview node to a canonical NUCC code:
// the best-matching code by weighted Jaccard similarity, falling back to the
// core domain generalist for the "other-*" catch-all nodes and for nodes that
// fail to score against the ontology.
//
// @param nodes - interview feature vectors keyed by complaint id
// @param codeSignatures - ICF domain signatures per NUCC code
// @param codeKeywords - refined keywords per NUCC code
// @param codeLabels - display label per NUCC code
// @param domainFallbacks - core domain -> generalist NUCC code
// @param keywordMap - authored keyword -> domain path
// @returns resolution per complaint id
func resolveInterviewNodes(
	nodes map[string]interviewNodeConfig,
	codeSignatures map[string][]string,
	codeKeywords map[string][]string,
	codeLabels map[string]string,
	domainFallbacks map[string]string,
	keywordMap map[string]string,
) map[string]ResolutionNode {
	out := make(map[string]ResolutionNode, len(nodes))
	for id, node := range nodes {
		if strings.HasPrefix(id, "other-") {
			out[id] = fallbackResolution(node.IcfDomain, domainFallbacks, codeLabels)
			continue
		}
		complaintDomains := complaintDomainSet(node, keywordMap)
		code, score := bestMatchingCode(complaintDomains, node.Keywords, codeSignatures, codeKeywords)
		if score <= 0 {
			out[id] = fallbackResolution(node.IcfDomain, domainFallbacks, codeLabels)
			continue
		}
		out[id] = ResolutionNode{NuccCode: code, Label: codeLabels[code], Score: score}
	}
	return out
}

// fallbackResolution pins an unresolved node to its core domain generalist.
func fallbackResolution(domain string, domainFallbacks map[string]string, codeLabels map[string]string) ResolutionNode {
	code := domainFallbacks[domain]
	return ResolutionNode{NuccCode: code, Label: codeLabels[code], Score: 1.0}
}

// sortedCodeKeys returns the NUCC codes in deterministic order.
func sortedCodeKeys(m map[string][]string) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}