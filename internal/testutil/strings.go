// Package testutil provides shared test utilities for the BFF test suites.
package testutil

// Contains checks if s contains sub as a substring.
func Contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || s != "" && containsSubstr(s, sub))
}

func containsSubstr(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
