package main

import (
	"bytes"
	"encoding/csv"
	"io"
	"strings"
)

// nuccNode represents a provider-level entry from NUCC taxonomy.
type nuccNode struct {
	Code           string
	Grouping       string
	Classification string
	Specialization string
	Definition     string
	DisplayName    string
}

// parseNUCC parses NUCC taxonomy CSV and returns provider-level entries.
func parseNUCC(data []byte) (map[string]*nuccNode, error) {
	nodes := make(map[string]*nuccNode)

	reader := csv.NewReader(bytes.NewReader(data))

	// Read header
	header, err := reader.Read()
	if err != nil {
		return nil, err
	}

	// Find column indices
	colIdx := make(map[string]int)
	for i, col := range header {
		colIdx[strings.TrimSpace(col)] = i
	}

	// Read rows
	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue // Skip malformed rows
		}

		// Get section
		section := getField(row, colIdx, "Section")
		if section != "Individual" {
			continue // Only provider-level
		}

		code := getField(row, colIdx, "Code")
		if code == "" {
			continue
		}

		nodes[code] = &nuccNode{
			Code:           code,
			Grouping:       getField(row, colIdx, "Grouping"),
			Classification: getField(row, colIdx, "Classification"),
			Specialization: getField(row, colIdx, "Specialization"),
			Definition:     getField(row, colIdx, "Definition"),
			DisplayName:    getField(row, colIdx, "Display Name"),
		}
	}

	return nodes, nil
}

// getField safely extracts a field from a CSV row.
func getField(row []string, colIdx map[string]int, name string) string {
	if idx, ok := colIdx[name]; ok && idx < len(row) {
		return strings.TrimSpace(row[idx])
	}
	return ""
}
