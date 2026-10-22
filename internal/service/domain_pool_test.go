package service

import (
	"testing"
)

// TestDomainGeneralist pins the generalist routing: mental/social/meaning
// domains route to the psychologist generalist, the rest to general practice.
func TestDomainGeneralist(t *testing.T) {
	for _, domain := range []string{"mental-emotional-health", "social-health-relationships", "meaning-purpose-fulfilment"} {
		if got := DomainGeneralist(domain); got != "103T00000X" {
			t.Errorf("DomainGeneralist(%q) = %q, want 103T00000X", domain, got)
		}
	}
	for _, domain := range []string{
		"physical-health", "functional-capacity", "health-behaviours-lifestyle",
		"environmental-contextual", "unknown-domain",
	} {
		if got := DomainGeneralist(domain); got != "208D00000X" {
			t.Errorf("DomainGeneralist(%q) = %q, want 208D00000X", domain, got)
		}
	}
}

// TestDomainCodesMentalPool asserts the mental-emotional-health pool contains
// both physician and psychologist competence codes and excludes codes from
// other domains (ophthalmology), pinning the DoD that a burnout complaint can
// only surface mental-pool cards.
func TestDomainCodesMentalPool(t *testing.T) {
	pool := domainCodes("mental-emotional-health", "")
	if len(pool) == 0 {
		t.Fatal("expected non-empty mental pool")
	}
	contains := func(code string) bool {
		for _, c := range pool {
			if c == code {
				return true
			}
		}
		return false
	}
	if !contains("2084P0800X") {
		t.Error("mental pool must contain Psychiatry Physician")
	}
	if !contains("103T00000X") {
		t.Error("mental pool must contain Psychologist")
	}
	if !contains("103TC1900X") {
		t.Error("mental pool must contain Counseling Psychologist")
	}
	if contains("207WX0107X") { // Ophthalmology
		t.Error("mental pool must not contain Ophthalmology")
	}
	if contains("207X00000X") { // Orthopaedic Surgery
		t.Error("mental pool must not contain Orthopaedic Surgery")
	}
}

// TestDomainCodesExcludeAndDeterminism pins the exclude code and stable order.
func TestDomainCodesExcludeAndDeterminism(t *testing.T) {
	pool := domainCodes("mental-emotional-health", "2084P0800X")
	for _, code := range pool {
		if code == "2084P0800X" {
			t.Errorf("exclude failed: %q present", code)
		}
	}
	again := domainCodes("mental-emotional-health", "2084P0800X")
	if len(pool) != len(again) {
		t.Fatalf("non-deterministic length: %d vs %d", len(pool), len(again))
	}
	for i := range pool {
		if pool[i] != again[i] {
			t.Fatalf("non-deterministic order at %d: %q vs %q", i, pool[i], again[i])
		}
	}
}

// TestDomainCodesEmptyDomain pins the empty-domain behavior: no pool.
func TestDomainCodesEmptyDomain(t *testing.T) {
	if got := domainCodes("", ""); len(got) != 0 {
		t.Errorf("expected empty pool for empty domain, got %v", got)
	}
}
