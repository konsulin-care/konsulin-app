package main

import (
	"encoding/csv"
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

// packageDir returns the directory of this test file, robust against the
// working directory go test happens to use.
func packageDir() string {
	_, file, _, _ := runtime.Caller(0)
	return filepath.Dir(file)
}

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

// loadStopWordSet reads the authored stop-words config for corpus tests.
func loadStopWordSet(t *testing.T) map[string]bool {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(packageDir(), "..", "..", "config", "stop-words.json"))
	if err != nil {
		t.Fatalf("reading stop-words.json: %v", err)
	}
	var words []string
	if err := json.Unmarshal(data, &words); err != nil {
		t.Fatalf("parsing stop-words.json: %v", err)
	}
	set := make(map[string]bool, len(words))
	for _, w := range words {
		set[w] = true
	}
	return set
}

// loadNuccDefinitions reads code -> definition pairs from the cached NUCC CSV.
func loadNuccDefinitions(t *testing.T) map[string]string {
	t.Helper()
	f, err := os.Open(filepath.Join(packageDir(), "..", "..", ".cache", "nucc-taxonomy.csv"))
	if err != nil {
		t.Fatalf("opening nucc-taxonomy.csv: %v", err)
	}
	defer f.Close()

	out := make(map[string]string)
	rows, err := csv.NewReader(f).ReadAll()
	if err != nil {
		t.Fatalf("reading nucc-taxonomy.csv: %v", err)
	}
	header := rows[0]
	idx := make(map[string]int, len(header))
	for i, col := range header {
		idx[col] = i
	}
	for _, row := range rows[1:] {
		if row[idx["Section"]] != "Individual" {
			continue
		}
		code := row[idx["Code"]]
		def := row[idx["Definition"]]
		if code != "" && def != "" {
			out[code] = def
		}
	}
	return out
}

// TestExtractKeywords exercises TF-IDF selection on a controlled corpus:
// ubiquitous words (df == N) get idf 0 and drop out, singleton words (df < 2)
// are dropped as noise, and discriminative shared words survive rank-ordered.
func TestExtractKeywords(t *testing.T) {
	definitions := map[string]string{
		"207Q00000X": "cardiac cardiac heart surgery care",
		"2084P0800X": "cardiac heart medicine care",
		"103G00000X": "mental psychiatry behavior care",
		"101Y00000X": "mental depression therapy care",
		"207X00000X": "joint bone orthopaedic care",
		"207XX0005X": "joint bone sports care",
	}
	stopWords := map[string]bool{"the": true, "and": true, "of": true, "a": true, "for": true}

	keywords := extractKeywords(definitions, stopWords, 10)

	// "care" appears in every definition -> idf 0 -> absent everywhere.
	for code, kws := range keywords {
		for _, kw := range kws {
			if kw == "care" {
				t.Errorf("%s: ubiquitous word 'care' must be absent (idf=0)", code)
			}
		}
	}

	// Tokens found in exactly one definition are dropped as singleton noise.
	for code, kws := range keywords {
		for _, kw := range kws {
			switch kw {
			case "surgery", "medicine", "psychiatry", "behavior", "depression",
				"therapy", "orthopaedic", "sports":
				t.Errorf("%s: singleton token %q must be dropped (df<2)", code, kw)
			}
		}
	}

	// Every code yields keywords and repeated tokens rank above single ones.
	if len(keywords) != 6 {
		t.Errorf("expected 6 codes with keywords, got %d", len(keywords))
	}
	a := keywords["207Q00000X"]
	if len(a) != 2 || a[0] != "cardiac" || a[1] != "heart" {
		t.Errorf("207Q00000X: expected [cardiac heart], got %v", a)
	}
}

// TestExtractKeywordsRealCorpus runs TF-IDF extraction over the cached NUCC
// corpus and asserts the plan DoD: 691+ codes produce keywords, per-code sets
// never exceed top-K, and the clinical generics added to stop-words.json never
// survive as keywords.
func TestExtractKeywordsRealCorpus(t *testing.T) {
	stopWords := loadStopWordSet(t)
	keywords := extractKeywords(loadNuccDefinitions(t), stopWords, 10)

	if len(keywords) < 691 {
		t.Errorf("expected >=691 codes with keywords, got %d", len(keywords))
	}
	for code, kws := range keywords {
		if len(kws) > 10 {
			t.Errorf("%s: %d keywords exceeds top-K 10", code, len(kws))
		}
		for _, kw := range kws {
			switch kw {
			case "care", "patient", "patients", "diagnosis", "diagnoses",
				"treatment", "treatments", "medical", "medicine":
				t.Errorf("%s: ubiquitous clinical word %q must be excluded", code, kw)
			}
		}
	}
}