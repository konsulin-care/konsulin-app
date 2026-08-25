package testutil

import "testing"

func TestContains(t *testing.T) {
	tests := []struct {
		name     string
		s        string
		sub      string
		expected bool
	}{
		{name: "exact match", s: "hello", sub: "hello", expected: true},
		{name: "substring at start", s: "hello world", sub: "hello", expected: true},
		{name: "substring at end", s: "hello world", sub: "world", expected: true},
		{name: "substring in middle", s: "hello world", sub: "lo wo", expected: true},
		{name: "no match", s: "hello", sub: "world", expected: false},
		{name: "empty sub", s: "hello", sub: "", expected: true},
		{name: "empty s", s: "", sub: "hello", expected: false},
		{name: "both empty", s: "", sub: "", expected: true},
		{name: "sub longer than s", s: "hi", sub: "hello", expected: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Contains(tt.s, tt.sub); got != tt.expected {
				t.Errorf("Contains(%q, %q) = %v, want %v", tt.s, tt.sub, got, tt.expected)
			}
		})
	}
}
