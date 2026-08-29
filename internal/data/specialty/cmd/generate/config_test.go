package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Core ICF domain keys shared with the frontend decision tree.
var coreDomains = []string{
	"physical-health",
	"mental-emotional-health",
	"social-health-relationships",
	"functional-capacity",
	"meaning-purpose-fulfilment",
	"health-behaviours-lifestyle",
	"environmental-contextual",
}

// All 41 chief-complaint ids from the TS decision tree (must match exactly).
var complaintIDs = []string{
	"pain-musculoskeletal", "headache-migraine", "respiratory-airway",
	"gastrointestinal", "sleep-fatigue", "fever-malaise", "other-physical",
	"low-mood", "anxiety-stress", "grief-trauma", "postpartum-mood",
	"burnout", "mood-swings", "other-mental",
	"couple-conflict", "family-dynamics", "workplace-conflict",
	"loneliness-isolation", "communication-barriers", "other-social",
	"focus-attention", "memory-decline", "daily-activities",
	"work-performance", "mobility-balance", "other-functional",
	"career-direction", "existential-purpose", "life-transition",
	"motivation-selfesteem", "other-purpose",
	"smoking-cessation", "alcohol-substance", "eating-weight",
	"sedentary-habits", "other-lifestyle",
	"caregiver-strain", "financial-stress", "relocation-adjustment",
	"ergonomic-strain", "other-environmental",
}

func loadJSONConfig[T any](t *testing.T, name string) T {
	t.Helper()
	var out T
	data, err := os.ReadFile(filepath.Join(packageDir(), "..", "..", "config", name))
	if err != nil {
		t.Fatalf("reading %s: %v", name, err)
	}
	if err := json.Unmarshal(data, &out); err != nil {
		t.Fatalf("parsing %s: %v", name, err)
	}
	return out
}

func TestDomainConfigStructure(t *testing.T) {
	type domainConfig struct {
		FallbackNuccCode string `json:"fallbackNuccCode"`
	}
	domains := loadJSONConfig[map[string]domainConfig](t, "domains.json")

	if len(domains) != 7 {
		t.Errorf("expected 7 core domains, got %d", len(domains))
	}
	nucc := loadNuccDefinitions(t)
	for _, core := range coreDomains {
		cfg, ok := domains[core]
		if !ok {
			t.Errorf("missing core domain %q", core)
			continue
		}
		if cfg.FallbackNuccCode == "" {
			t.Errorf("%s: missing fallbackNuccCode", core)
			continue
		}
		if _, exists := nucc[cfg.FallbackNuccCode]; !exists {
			t.Errorf("%s: fallbackNuccCode %q not found in NUCC index",
				core, cfg.FallbackNuccCode)
		}
	}
}

func TestKeywordMapResolvesToDomains(t *testing.T) {
	domains := loadJSONConfig[map[string]map[string]any](t, "domains.json")
	keywordMap := loadJSONConfig[map[string]string](t, "keyword-map.json")

	if len(keywordMap) < 100 {
		t.Errorf("expected an extensive keyword map, got %d entries", len(keywordMap))
	}
	for kw, path := range keywordMap {
		parts := strings.Split(path, ".")
		core := parts[0]
		if _, ok := domains[core]; !ok {
			t.Errorf("keyword %q maps to unknown core domain %q", kw, core)
			continue
		}
		if len(parts) == 2 {
			subs, subOK := domains[core]["subdomains"].(map[string]any)
			if !subOK {
				t.Errorf("domain %q has no subdomains object", core)
				continue
			}
			if _, ok := subs[parts[1]]; !ok {
				t.Errorf("keyword %q maps to unknown subdomain %q", kw, path)
			}
		}
		if len(parts) > 2 {
			t.Errorf("keyword %q path %q exceeds domain depth 2", kw, path)
		}
	}
}

func TestInterviewMapStructure(t *testing.T) {
	type interviewNode struct {
		IcfDomain string   `json:"icfDomain"`
		Keywords  []string `json:"keywords"`
	}
	nodes := loadJSONConfig[map[string]interviewNode](t, "interview-map.json")

	if len(nodes) != len(complaintIDs) {
		t.Errorf("expected %d interview nodes, got %d", len(complaintIDs), len(nodes))
	}
	coreSet := map[string]bool{}
	for _, c := range coreDomains {
		coreSet[c] = true
	}
	for _, id := range complaintIDs {
		node, ok := nodes[id]
		if !ok {
			t.Errorf("interview-map missing complaint %q", id)
			continue
		}
		if !coreSet[node.IcfDomain] {
			t.Errorf("%s: unknown icfDomain %q", id, node.IcfDomain)
		}
	}

	keywordMap := loadJSONConfig[map[string]string](t, "keyword-map.json")
	for id, node := range nodes {
		if len(node.Keywords) == 0 {
			t.Errorf("%s: no keywords authored", id)
		}
		for _, kw := range node.Keywords {
			if _, ok := keywordMap[kw]; !ok {
				t.Errorf("%s: keyword %q not covered by keyword-map.json", id, kw)
			}
		}
	}
}
