package main

import (
	"strings"
	"testing"
)

// TestResolveInterviewNodes runs domain-gated resolution over the cached
// corpus and asserts the Step 4 DoD: all 41 nodes resolve and every winning
// code's competence signature contains the complaint's declared icfDomain.
func TestResolveInterviewNodes(t *testing.T) {
	stopWords := loadStopWordSet(t)
	definitions := loadNuccDefinitions(t)
	nodes := loadNuccNodes(t)
	keywordMap := loadJSONConfig[map[string]string](t, "keyword-map.json")
	groupingMap := loadJSONConfig[map[string]string](t, "grouping-to-domain.json")
	domainsCfg := loadJSONConfig[map[string]interface{}](t, "domains.json")
	interview := loadJSONConfig[map[string]interviewNodeConfig](t, "interview-map.json")
	competence := loadCompetenceMatrix(t)
	exceptions := loadCompetenceExceptions(t)

	keywords := extractKeywords(definitions, stopWords, 10)
	signatures := applyCompetenceSignatures(nodes, groupingMap, competence, exceptions)

	labels := make(map[string]string, len(nodes))
	for code, node := range nodes {
		labels[code] = node.DisplayName
	}
	fallbacks := make(map[string]string, len(domainsCfg))
	for core, cfg := range domainsCfg {
		obj := cfg.(map[string]interface{})
		fallbacks[core] = obj["fallbackNuccCode"].(string)
	}

	resolved := resolveInterviewNodes(interview, signatures, keywords, labels, fallbacks, keywordMap)

	if len(resolved) != len(interview) {
		t.Errorf("expected %d resolutions, got %d", len(interview), len(resolved))
	}
	for id, node := range interview {
		r, ok := resolved[id]
		if !ok || r.NuccCode == "" {
			t.Errorf("%s: no resolution", id)
			continue
		}
		if r.Label == "" {
			t.Errorf("%s: missing label", id)
		}
		// Catch-all nodes are generalist-pinned by domains.json (their
		// generalist may be a physical-health code); pool membership applies
		// to regular complaints only.
		if strings.HasPrefix(id, "other-") {
			continue
		}
		sig := signatures[r.NuccCode]
		if len(sig) == 0 {
			t.Errorf("%s: winner %s has no signature", id, r.NuccCode)
			continue
		}
		if !containsPath(sig, node.IcfDomain) {
			t.Errorf("%s: winner %s (%s) signature %v lacks declared domain %q",
				id, r.NuccCode, r.Label, sig, node.IcfDomain)
		}
	}
}

// TestResolutionStaysInDomainPool pins the regression cases the plan
// requires: burnout stays inside the mental pool and the self-esteem
// complaint cannot land on forensic psychology (excluded from the meaning
// pool via the code exception).
func TestResolutionStaysInDomainPool(t *testing.T) {
	stopWords := loadStopWordSet(t)
	definitions := loadNuccDefinitions(t)
	nodes := loadNuccNodes(t)
	keywordMap := loadJSONConfig[map[string]string](t, "keyword-map.json")
	groupingMap := loadJSONConfig[map[string]string](t, "grouping-to-domain.json")
	domainsCfg := loadJSONConfig[map[string]interface{}](t, "domains.json")
	interview := loadJSONConfig[map[string]interviewNodeConfig](t, "interview-map.json")
	competence := loadCompetenceMatrix(t)
	exceptions := loadCompetenceExceptions(t)

	keywords := extractKeywords(definitions, stopWords, 10)
	signatures := applyCompetenceSignatures(nodes, groupingMap, competence, exceptions)
	labels := make(map[string]string, len(nodes))
	for code, node := range nodes {
		labels[code] = node.DisplayName
	}
	fallbacks := make(map[string]string, len(domainsCfg))
	for core, cfg := range domainsCfg {
		obj := cfg.(map[string]interface{})
		fallbacks[core] = obj["fallbackNuccCode"].(string)
	}

	resolved := resolveInterviewNodes(interview, signatures, keywords, labels, fallbacks, keywordMap)

	burnout := resolved["burnout"]
	if burnout.NuccCode == "" || !containsPath(signatures[burnout.NuccCode], "mental-emotional-health") {
		t.Errorf("burnout winner %s must stay in the mental pool", burnout.NuccCode)
	}
	selfesteem := resolved["motivation-selfesteem"]
	if selfesteem.NuccCode == "103TF0200X" {
		t.Errorf("motivation-selfesteem must not resolve to Forensic Psychologist, got %s", selfesteem.NuccCode)
	}
	if selfesteem.NuccCode == "" || !containsPath(signatures[selfesteem.NuccCode], "meaning-purpose-fulfilment") {
		t.Errorf("motivation-selfesteem winner %s must stay in the meaning pool", selfesteem.NuccCode)
	}
}
