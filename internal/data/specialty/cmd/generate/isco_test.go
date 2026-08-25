package main

import (
	"encoding/json"
	"testing"
)

// Sample ISCO-08 data for testing
const sampleISCO = `{
  "resourceType": "CodeSystem",
  "concept": [
    {
      "code": "2",
      "display": "Professionals",
      "concept": [
        {
          "code": "22",
          "display": "Health Professionals",
          "concept": [
            {
              "code": "221",
              "display": "Medical Doctors",
              "concept": [
                {
                  "code": "2211",
                  "display": "Generalist Medical Practitioners"
                },
                {
                  "code": "2212",
                  "display": "Specialist Medical Practitioners"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}`

func TestParseISCO(t *testing.T) {
	var codeSystem map[string]any
	if err := json.Unmarshal([]byte(sampleISCO), &codeSystem); err != nil {
		t.Fatal(err)
	}

	nodes, err := parseISCO(codeSystem)
	if err != nil {
		t.Fatal(err)
	}

	// Check root node
	if _, ok := nodes["2"]; !ok {
		t.Error("expected root node '2'")
	}

	// Check hierarchy
	if nodes["2211"].Parent != "221" {
		t.Errorf("expected parent '221', got '%s'", nodes["2211"].Parent)
	}

	// Check depth
	if nodes["2211"].Depth != 4 {
		t.Errorf("expected depth 4, got %d", nodes["2211"].Depth)
	}
}

func TestFindLCA(t *testing.T) {
	nodes := map[string]*iscoNode{
		"2":    {Code: "2", Parent: ""},
		"22":   {Code: "22", Parent: "2"},
		"26":   {Code: "26", Parent: "2"},
		"221":  {Code: "221", Parent: "22"},
		"2211": {Code: "2211", Parent: "221"},
		"2212": {Code: "2212", Parent: "221"},
		"263":  {Code: "263", Parent: "26"},
		"2634": {Code: "2634", Parent: "263"},
	}

	// Test same branch
	lca := findLCA("2211", "2212", nodes)
	if lca != "221" {
		t.Errorf("expected LCA '221', got '%s'", lca)
	}

	// Test different branches
	lca = findLCA("2211", "2634", nodes)
	if lca != "2" {
		t.Errorf("expected LCA '2', got '%s'", lca)
	}

	// Test same node
	lca = findLCA("2211", "2211", nodes)
	if lca != "2211" {
		t.Errorf("expected LCA '2211', got '%s'", lca)
	}
}

func TestStructuralDistance(t *testing.T) {
	nodes := map[string]*iscoNode{
		"2":    {Code: "2", Parent: "", Depth: 1},
		"22":   {Code: "22", Parent: "2", Depth: 2},
		"221":  {Code: "221", Parent: "22", Depth: 3},
		"2211": {Code: "2211", Parent: "221", Depth: 4},
		"2212": {Code: "2212", Parent: "221", Depth: 4},
	}

	// Same node should be 1.0
	dist := structuralDistance("2211", "2211", nodes)
	if dist != 1.0 {
		t.Errorf("expected 1.0 for same node, got %f", dist)
	}

	// Siblings should be close
	dist = structuralDistance("2211", "2212", nodes)
	if dist < 0.7 || dist > 1.0 {
		t.Errorf("expected close proximity for siblings, got %f", dist)
	}

	// Distant nodes should be further
	dist = structuralDistance("2211", "2", nodes)
	if dist > 0.5 {
		t.Errorf("expected lower proximity for distant nodes, got %f", dist)
	}
}
