package specialty

import (
	"sort"
	"strings"
	"testing"
)

// TestLoadIndex wires the embedded index data: direct index, inverted keyword
// index, and the interview resolution map must be available after LoadIndex.
func TestLoadIndex(t *testing.T) {
	idx := LoadIndex()
	if idx == nil {
		t.Fatal("expected non-nil index")
	}
	if len(idx.ByNuccCode) < 690 {
		t.Errorf("expected >=690 specialties in direct index, got %d", len(idx.ByNuccCode))
	}

	node := idx.LookupByNuccCode("103T00000X")
	if node == nil {
		t.Fatal("expected Psychologist node")
	}
	if node.Label != "Psychologist" {
		t.Errorf("expected label 'Psychologist', got %q", node.Label)
	}
	if node.IscoCode != "2634" {
		t.Errorf("expected iscoCode '2634', got %q", node.IscoCode)
	}

	codes := idx.LookupByKeyword("psychological")
	if len(codes) == 0 {
		t.Error("expected keyword lookup to return codes")
	}
	for _, code := range codes {
		if idx.LookupByNuccCode(code) == nil {
			t.Errorf("keyword %q points to missing code %q", "psychological", code)
		}
	}

	if len(idx.Resolutions) != 41 {
		t.Errorf("expected 41 interview resolutions, got %d", len(idx.Resolutions))
	}
	res := idx.Resolutions["pain-musculoskeletal"]
	if res.NuccCode != "207X00000X" {
		t.Errorf("expected resolution 207X00000X, got %q", res.NuccCode)
	}
}

// TestNearbyNuccCodes exercises proximity-driven expansion: neighbors are
// sorted by score descending, exclude the query code, stay above the
// threshold, and unknown codes yield nothing.
func TestNearbyNuccCodes(t *testing.T) {
	idx := LoadIndex()

	neighbors := idx.NearbyNuccCodes("103T00000X", 5, 0.6)
	if len(neighbors) == 0 {
		t.Fatal("expected nearby codes for Psychologist")
	}
	if len(neighbors) > 5 {
		t.Errorf("expected at most 5 neighbors, got %d", len(neighbors))
	}
	prev := 2.0
	for i, code := range neighbors {
		if code == "103T00000X" {
			t.Errorf("neighbor %d must exclude the query code", i)
		}
		score := idx.GetProximity("103T00000X", code)
		if score < 0.6 {
			t.Errorf("neighbor %s below threshold: %.3f", code, score)
		}
		if score > prev {
			t.Errorf("neighbors not sorted descending at %d: %.3f > %.3f",
				i, score, prev)
		}
		prev = score
	}

	// Proximity-driven expansion must prefer the query specialty's own family:
	// psychiatry's neighbors above threshold are all Psychiatry & Neurology
	// classification codes (identical competence signatures score 1.0).
	psych := idx.NearbyNuccCodes("2084P0800X", 5, 0.5)
	if len(psych) == 0 {
		t.Fatal("expected psychiatry neighbors above threshold")
	}
	if !allStartWith(psych, "2084") {
		t.Errorf("expected psychiatry-family neighbors, got %v", psych)
	}

	// Proximity must be symmetric: A in B's neighbors iff B in A's neighbors
	// (score-equivalent pairs rank the same in both directions).
	if score := idx.GetProximity("2084P0800X", "103T00000X"); score != idx.GetProximity("103T00000X", "2084P0800X") {
		t.Errorf("proximity not symmetric: %.4f vs %.4f",
			score, idx.GetProximity("103T00000X", "2084P0800X"))
	}

	if got := idx.NearbyNuccCodes("NOT-A-CODE", 5, 0.6); len(got) != 0 {
		t.Errorf("expected empty result for unknown code, got %v", got)
	}
	if got := idx.NearbyNuccCodes("103T00000X", 0, 0.6); len(got) != 0 {
		t.Errorf("expected empty result for maxK=0, got %v", got)
	}
}

// TestNearbyNuccCodesDeterministic asserts tie-breaking is stable.
func TestNearbyNuccCodesDeterministic(t *testing.T) {
	idx := LoadIndex()
	a := idx.NearbyNuccCodes("208D00000X", 10, 0.4)
	b := idx.NearbyNuccCodes("208D00000X", 10, 0.4)
	if len(a) != len(b) {
		t.Fatalf("length mismatch: %d vs %d", len(a), len(b))
	}
	for i := range a {
		if a[i] != b[i] {
			t.Fatalf("non-deterministic order at %d: %q vs %q", i, a[i], b[i])
		}
	}
	if !sort.StringsAreSorted(a) {
		t.Logf("note: codes not lexicographically sorted (score ordering expected), got %v", a)
	}
}

// allStartWith reports whether every item has the given prefix.
func allStartWith(items []string, prefix string) bool {
	for _, it := range items {
		if !strings.HasPrefix(it, prefix) {
			return false
		}
	}
	return true
}
