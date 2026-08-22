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
