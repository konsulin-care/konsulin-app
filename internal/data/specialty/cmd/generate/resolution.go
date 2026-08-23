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
// keyword-derived paths carry the discriminating power within a pool.
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

// domainCoverage measures how much of the complaint's keyword-derived domain
// set the code's competence signature covers:
//
//	coverage = |complaintDomains ∩ codeSignature| / |complaintDomains|
//
// Asymmetric on purpose: a code with a broad signature is not rewarded for
// having extra unrelated competences (symmetric Jaccard penalizes
// specialists whose classification lists many paths). An empty complaint
// domain set scores 0.5 (neutral).
func domainCoverage(complaintDomains, codeSignature []string) float64 {
	if len(complaintDomains) == 0 {
		return 0.5
	}
	sig := make(map[string]bool, len(codeSignature))
	for _, p := range codeSignature {
		sig[p] = true
	}
	inter := 0
	for _, p := range complaintDomains {
		if sig[p] {
			inter++
		}
	}
	return float64(inter) / float64(len(complaintDomains))
}

// bestMatchingCode picks the NUCC code with the highest relevance score
// within a candidate pool:
//
//	score = 0.7 * keyword Jaccard + 0.3 * domain coverage
//
// The keyword term carries per-code specificity (TF-IDF keyword sets differ
// between codes of the same classification); the coverage term ties the
// rank to the competence matrix without penalizing specialists. The pool is
// pre-filtered to the complaint's declared ICF domain, so the winner is
// always in-domain. Codes are scanned in sorted order so ties resolve
// deterministically. Returns "" when the pool is empty.
func bestMatchingCode(
	complaintDomains, complaintKeywords, pool []string,
	codeSignatures map[string][]string,
	codeKeywords map[string][]string,
) (string, float64) {
	best := ""
	bestScore := 0.0
	for _, code := range pool {
		score := 0.7*stemmedJaccard(complaintKeywords, codeKeywords[code]) +
			0.3*domainCoverage(complaintDomains, codeSignatures[code])
		if score > bestScore {
			best = code
			bestScore = score
		}
	}
	return best, bestScore
}

// resolveInterviewNodes maps every interview node to a canonical NUCC code:
// the best-matching code within the complaint's declared ICF-domain pool
// (codes whose competence signature intersects the domain), falling back to
// the core domain generalist for the "other-*" catch-all nodes and for nodes
// whose pool is empty.
//
// @param nodes - interview feature vectors keyed by complaint id
// @param codeSignatures - ICF domain competence paths per NUCC code
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
		pool := domainPool(node.IcfDomain, codeSignatures)
		complaintDomains := complaintDomainSet(node, keywordMap)
		code, score := bestMatchingCode(complaintDomains, node.Keywords, pool, codeSignatures, codeKeywords)
		if code == "" {
			out[id] = fallbackResolution(node.IcfDomain, domainFallbacks, codeLabels)
			continue
		}
		out[id] = ResolutionNode{NuccCode: code, Label: codeLabels[code], Score: score}
	}
	return out
}

// domainPool returns the codes whose competence signature contains a path in
// the given bare ICF domain, in deterministic sorted order.
func domainPool(domain string, codeSignatures map[string][]string) []string {
	var out []string
	for code, sig := range codeSignatures {
		for _, p := range sig {
			if p == domain || strings.HasPrefix(p, domain+".") {
				out = append(out, code)
				break
			}
		}
	}
	sort.Strings(out)
	return out
}

// fallbackResolution pins an unresolved node to its core domain generalist.
func fallbackResolution(domain string, domainFallbacks map[string]string, codeLabels map[string]string) ResolutionNode {
	code := domainFallbacks[domain]
	return ResolutionNode{NuccCode: code, Label: codeLabels[code], Score: 1.0}
}