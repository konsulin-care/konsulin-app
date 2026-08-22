package main

import (
	"testing"
)

func TestTokenize(t *testing.T) {
	tokens := tokenize("Family Medicine is the medical specialty which is concerned with the total health care")
	// Expected: family, medicine, is, the, medical, specialty, which, is, concerned, with, the, total, health, care = 14 tokens
	if len(tokens) != 14 {
		t.Errorf("expected 14 tokens, got %d", len(tokens))
	}
	if tokens[0] != "family" {
		t.Errorf("expected first token 'family', got '%s'", tokens[0])
	}
}

func TestRemoveStopWords(t *testing.T) {
	stopWords := map[string]bool{
		"is":   true,
		"the":  true,
		"with": true,
	}
	tokens := []string{"family", "medicine", "is", "the", "medical", "specialty", "with", "care"}
	result := removeStopWords(tokens, stopWords)

	expected := []string{"family", "medicine", "medical", "specialty", "care"}
	if len(result) != len(expected) {
		t.Errorf("expected %d tokens, got %d", len(expected), len(result))
	}
	for i, tok := range result {
		if tok != expected[i] {
			t.Errorf("expected token '%s', got '%s'", expected[i], tok)
		}
	}
}

func TestExtractKeywords(t *testing.T) {
	definitions := map[string]string{
		"207Q00000X": "Family Medicine is the medical specialty which is concerned with the total health care of the individual and the family.",
		"2084P0800X": "A Psychiatrist specializes in the prevention, diagnosis, and treatment of mental, emotional, and behavioral disorders.",
	}

	stopWords := map[string]bool{
		"is":   true,
		"the":  true,
		"and":  true,
		"of":   true,
		"a":    true,
		"with": true,
	}

	// Minimum frequency of 1 for this test
	keywords := extractKeywords(definitions, stopWords, 1)

	// Check that keywords were extracted
	if len(keywords) == 0 {
		t.Error("expected keywords to be extracted")
	}

	// Check specific keywords
	if _, ok := keywords["207Q00000X"]; !ok {
		t.Error("expected keywords for Family Medicine")
	}
}
