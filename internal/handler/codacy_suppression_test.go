package handler

import (
	"os"
	"strings"
	"testing"
)

// assertNosemgrepSuppression guards the // nosemgrep suppressions that silence
// Codacy's Semgrep engine. Codacy ignores //nolint and //NOSONAR comments; only
// a // nosemgrep comment on the line directly above a match suppresses it.
// This is a static regression guard for the PR #641 Codacy findings.
func assertNosemgrepSuppression(t *testing.T, file, needle string) {
	t.Helper()

	raw, err := os.ReadFile(file)
	if err != nil {
		t.Fatalf("read %s: %v", file, err)
	}

	lines := strings.Split(string(raw), "\n")
	for i, line := range lines {
		if !strings.Contains(line, needle) {
			continue
		}
		if i == 0 || !strings.Contains(lines[i-1], "nosemgrep") {
			t.Errorf("%s:%d %q must be directly preceded by a // nosemgrep comment",
				file, i+1, strings.TrimSpace(line))
		}
	}
}

// TestCodacySuppressionAuthCookies verifies every SetCookie in
// NewLogoutHandler carries a // nosemgrep comment on the line directly above.
// Secure follows runtime env (cfg.CookieSecure), so Codacy re-flags these
// otherwise-intentional cookie clears on every changed line.
func TestCodacySuppressionAuthCookies(t *testing.T) {
	assertNosemgrepSuppression(t, "auth.go", "http.SetCookie")
}

// TestCodacySuppressionQuestionnaireCreate verifies the SSRF suppression sits
// directly above http.NewRequest — Semgrep matches the request creation, not
// the targetURL assignment two lines above it.
func TestCodacySuppressionQuestionnaireCreate(t *testing.T) {
	assertNosemgrepSuppression(t, "questionnaire_create.go", "http.NewRequest")
}
