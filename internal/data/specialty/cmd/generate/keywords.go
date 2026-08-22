package main

import (
	"strings"
	"unicode"
)

// tokenize splits text into lowercase tokens.
func tokenize(text string) []string {
	var tokens []string
	var current strings.Builder

	for _, r := range strings.ToLower(text) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			current.WriteRune(r)
		} else {
			if current.Len() > 0 {
				tokens = append(tokens, current.String())
				current.Reset()
			}
		}
	}
	if current.Len() > 0 {
		tokens = append(tokens, current.String())
	}

	return tokens
}

// removeStopWords filters out stop words from tokens.
func removeStopWords(tokens []string, stopWords map[string]bool) []string {
	var result []string
	for _, tok := range tokens {
		if !stopWords[tok] {
			result = append(result, tok)
		}
	}
	return result
}

// extractKeywords extracts keywords from definitions.
// Returns map of nuccCode to keywords.
func extractKeywords(definitions map[string]string, stopWords map[string]bool, minFreq int) map[string][]string {
	wordFreq, codeWords := countCodeWords(definitions, stopWords)
	return filterCodeKeywords(codeWords, wordFreq, minFreq)
}

// countCodeWords tokenizes definitions and counts per-code word occurrences.
func countCodeWords(definitions map[string]string, stopWords map[string]bool) (map[string]int, map[string]map[string]bool) {
	wordFreq := make(map[string]int)
	codeWords := make(map[string]map[string]bool)

	for code, def := range definitions {
		tokens := tokenize(def)
		tokens = removeStopWords(tokens, stopWords)

		seen := make(map[string]bool)
		for _, tok := range tokens {
			wordFreq[tok]++
			if !seen[tok] {
				seen[tok] = true
				if codeWords[code] == nil {
					codeWords[code] = make(map[string]bool)
				}
				codeWords[code][tok] = true
			}
		}
	}

	return wordFreq, codeWords
}

// filterCodeKeywords keeps words that occur in at least minFreq definitions.
func filterCodeKeywords(codeWords map[string]map[string]bool, wordFreq map[string]int, minFreq int) map[string][]string {
	keywords := make(map[string][]string)
	for code, words := range codeWords {
		var codeKeywords []string
		for word := range words {
			if wordFreq[word] >= minFreq {
				codeKeywords = append(codeKeywords, word)
			}
		}
		if len(codeKeywords) > 0 {
			keywords[code] = codeKeywords
		}
	}

	return keywords
}
