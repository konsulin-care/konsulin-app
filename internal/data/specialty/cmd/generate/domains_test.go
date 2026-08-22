package main

import (
	"testing"
)

func TestBuildCoOccurrenceMatrix(t *testing.T) {
	keywords := map[string][]string{
		"207Q00000X": {"family", "medicine", "medical", "care"},
		"2084P0800X": {"psychiatrist", "mental", "behavioral", "disorders"},
	}

	matrix := buildCoOccurrenceMatrix(keywords)

	// Check that co-occurrences are counted
	if matrix["family"]["medicine"] != 1 {
		t.Errorf("expected co-occurrence 1, got %d", matrix["family"]["medicine"])
	}

	// Words in same code should co-occur
	if matrix["mental"]["behavioral"] != 1 {
		t.Errorf("expected co-occurrence 1, got %d", matrix["mental"]["behavioral"])
	}
}

func TestUnionFind(t *testing.T) {
	uf := newUnionFind()

	// Add elements
	uf.Add("a")
	uf.Add("b")
	uf.Add("c")

	// Union some elements
	uf.Union("a", "b")

	// Check that a and b are in same set
	if uf.Find("a") != uf.Find("b") {
		t.Error("expected a and b to be in same set")
	}

	// Check that c is in different set
	if uf.Find("a") == uf.Find("c") {
		t.Error("expected a and c to be in different sets")
	}

	// Union more
	uf.Union("b", "c")
	if uf.Find("a") != uf.Find("c") {
		t.Error("expected all elements to be in same set after union")
	}
}

func TestClusterKeywords(t *testing.T) {
	matrix := map[string]map[string]int{
		"family":     {"medicine": 1, "medical": 1},
		"medicine":   {"family": 1, "medical": 1},
		"medical":    {"family": 1, "medicine": 1},
		"mental":     {"behavioral": 1, "disorders": 1},
		"behavioral": {"mental": 1, "disorders": 1},
		"disorders":  {"mental": 1, "behavioral": 1},
	}

	clusters := clusterKeywords(matrix)

	// Should have 2 clusters
	if len(clusters) != 2 {
		t.Errorf("expected 2 clusters, got %d", len(clusters))
	}

	// Each keyword must belong to exactly one cluster; verify the two
	// keyword families stay grouped together and apart from each other.
	clusterOf := make(map[string]int)
	for i, cluster := range clusters {
		for _, kw := range cluster {
			clusterOf[kw] = i
		}
	}

	if clusterOf["family"] != clusterOf["medicine"] || clusterOf["medicine"] != clusterOf["medical"] {
		t.Error("expected family/medicine/medical to share a cluster")
	}
	if clusterOf["mental"] != clusterOf["behavioral"] || clusterOf["behavioral"] != clusterOf["disorders"] {
		t.Error("expected mental/behavioral/disorders to share a cluster")
	}
	if clusterOf["family"] == clusterOf["mental"] {
		t.Error("expected distinct clusters for the two keyword families")
	}
}

func TestBuildKeywordDomainMap(t *testing.T) {
	keywords := map[string][]string{
		"207Q00000X": {"family", "medicine", "mental"},
		"2084P0800X": {"psychiatrist", "mental", "behavioral"},
		"2084B0002X": {"behavioral", "disorders"},
		"9999":       {"mystery"},
	}

	nodes := map[string]*nuccNode{
		"207Q00000X": {
			Code:     "207Q00000X",
			Grouping: "Allopathic & Osteopathic Physicians",
		},
		"2084P0800X": {
			Code:     "2084P0800X",
			Grouping: "Behavioral Health & Social Service Providers",
		},
		"2084B0002X": {
			Code:     "2084B0002X",
			Grouping: "Behavioral Health & Social Service Providers",
		},
		"9999": {Code: "9999", Grouping: ""},
	}

	got := buildKeywordDomainMap(keywords, nodes)

	// Most frequent grouping wins.
	if got["behavioral"] != "Behavioral Health & Social Service Providers" {
		t.Errorf("expected behavioral to map to behavioral grouping, got %q", got["behavioral"])
	}
	if got["family"] != "Allopathic & Osteopathic Physicians" {
		t.Errorf("expected family to map to allopathic grouping, got %q", got["family"])
	}

	// Ties resolve to the lexicographically smallest grouping name.
	if got["mental"] != "Allopathic & Osteopathic Physicians" {
		t.Errorf("expected mental to map to the lexicographically smaller grouping, got %q", got["mental"])
	}

	// Keywords from codes without a grouping are skipped.
	if _, ok := got["mystery"]; ok {
		t.Error("expected 'mystery' to be skipped for empty grouping")
	}

	// Keywords from codes absent from the node map are skipped.
	keywords["5555"] = []string{"ghost"}
	got = buildKeywordDomainMap(keywords, nodes)
	if _, ok := got["ghost"]; ok {
		t.Error("expected 'ghost' to be skipped for missing node")
	}
}

func TestMergeKeywordDomainMaps(t *testing.T) {
	auto := map[string]string{
		"family":     "Allopathic & Osteopathic Physicians",
		"behavioral": "Behavioral Health & Social Service Providers",
	}
	overrides := map[string]string{
		"behavioral": "behavioral-health",
		"mental":     "mental-health",
	}

	merged := mergeKeywordDomainMaps(auto, overrides)

	if merged["family"] != "Allopathic & Osteopathic Physicians" {
		t.Errorf("expected auto mapping preserved, got %q", merged["family"])
	}
	if merged["behavioral"] != "behavioral-health" {
		t.Errorf("expected authored override to win, got %q", merged["behavioral"])
	}
	if merged["mental"] != "mental-health" {
		t.Errorf("expected override-only key present, got %q", merged["mental"])
	}
	if len(merged) != 3 {
		t.Errorf("expected 3 merged entries, got %d", len(merged))
	}

	// Nil overrides keep the auto mapping untouched.
	merged = mergeKeywordDomainMaps(auto, nil)
	if len(merged) != 2 || merged["family"] != "Allopathic & Osteopathic Physicians" {
		t.Errorf("expected nil overrides to keep auto map, got %v", merged)
	}
}
