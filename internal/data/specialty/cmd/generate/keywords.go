package main

import (
	"math"
	"sort"
	"strings"
	"unicode"
)

// tokenize splits text into lowercase alphanumeric tokens.
func tokenize(text string) []string {
	var tokens []string
	var current strings.Builder

	for _, r := range strings.ToLower(text) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			current.WriteRune(r)
		} else if current.Len() > 0 {
			tokens = append(tokens, current.String())
			current.Reset()
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

// codeTermCounts tokenizes every definition once, removing stop words, and
// returns per-code term counts plus the document frequency of each term.
// Codes whose definition contributes no tokens are skipped entirely.
func codeTermCounts(definitions map[string]string, stopWords map[string]bool) (map[string]map[string]int, map[string]int) {
	counts := make(map[string]map[string]int)
	df := make(map[string]int)
	for code, def := range definitions {
		tokens := removeStopWords(tokenize(def), stopWords)
		codeCounts := make(map[string]int)
		for _, tok := range tokens {
			codeCounts[tok]++
		}
		if len(codeCounts) == 0 {
			continue
		}
		counts[code] = codeCounts
		for tok := range codeCounts {
			df[tok]++
		}
	}
	return counts, df
}

// rankKeywords scores every term of one code with tf*idf and returns the
// top-K tokens ordered by score descending (alphabetical tie-break). Tokens
// with df < 2 (singleton noise) or a non-positive score (idf 0, i.e. present
// in every document of the corpus) are dropped.
func rankKeywords(counts map[string]int, df map[string]int, n, topK int) []string {
	type scored struct {
		token string
		score float64
	}
	maxCount := 0
	for _, c := range counts {
		if c > maxCount {
			maxCount = c
		}
	}
	scores := make([]scored, 0, len(counts))
	for tok, c := range counts {
		if df[tok] < 2 {
			continue
		}
		score := (float64(c) / float64(maxCount)) * math.Log(float64(n)/float64(df[tok]))
		if score <= 0 {
			continue
		}
		scores = append(scores, scored{token: tok, score: score})
	}
	sort.Slice(scores, func(i, j int) bool {
		if scores[i].score != scores[j].score {
			return scores[i].score > scores[j].score
		}
		return scores[i].token < scores[j].token
	})
	if len(scores) > topK {
		scores = scores[:topK]
	}
	out := make([]string, 0, len(scores))
	for _, s := range scores {
		out = append(out, s.token)
	}
	return out
}

// extractKeywords extracts the top-K most discriminative tokens per NUCC
// definition using TF-IDF over the corpus of definitions:
//
//	tf(t, c) = count(t, c) / max(count(*, c))
//	idf(t)   = ln(N / df(t))
//	score    = tf * idf
//
// Tokens occurring in fewer than two definitions are dropped as singleton
// noise; tokens occurring in every definition get idf 0 and are dropped as
// non-descriptive. Every code with at least one scored token is returned in
// keyword order (highest score first).
//
// @param definitions - map of NUCC code to definition text
// @param stopWords - stop-word set applied before counting
// @param topK - maximum number of keywords kept per code
// @returns map of NUCC code to its top-K keywords
func extractKeywords(definitions map[string]string, stopWords map[string]bool, topK int) map[string][]string {
	counts, df := codeTermCounts(definitions, stopWords)
	n := len(counts)

	out := make(map[string][]string, len(counts))
	for code, codeCounts := range counts {
		kws := rankKeywords(codeCounts, df, n, topK)
		if len(kws) > 0 {
			out[code] = kws
		}
	}
	return out
}
