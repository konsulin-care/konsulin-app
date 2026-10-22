package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

// TestRoutes_protectedPageHandler_rejectsPathTraversal verifies that
// requests containing ".." path segments cannot escape the outDir.
func TestRoutes_protectedPageHandler_rejectsPathTraversal(t *testing.T) {
	tmpDir := t.TempDir()
	outDir := filepath.Join(tmpDir, "out")
	if err := os.MkdirAll(outDir, 0700); err != nil {
		t.Fatalf("mkdir out: %v", err)
	}
	// Create a file that should never be served via traversal.
	sensitiveFile := filepath.Join(tmpDir, "secret.txt")
	if err := os.WriteFile(sensitiveFile, []byte("sensitive"), 0644); err != nil {
		t.Fatalf("write secret.txt: %v", err)
	}
	// Create a valid page.
	if err := os.WriteFile(filepath.Join(outDir, "journal.html"), []byte("journal"), 0644); err != nil {
		t.Fatalf("write journal.html: %v", err)
	}
	t.Chdir(tmpDir)

	cfg := newTestConfig(t, "01234567890123456789012345678901")
	cfg.NextjsURL = "http://localhost:9999"
	handler, err := routes(cfg)
	if err != nil {
		t.Fatalf("routes() failed: %v", err)
	}

	// Sub-path under a protected route; protectedPageHandler serves these.
	traversalPaths := []string{
		"/journal/../secret.txt",
		"/journal/..%2Fsecret.txt",
		"/journal/..%252Fsecret.txt",
	}
	for _, p := range traversalPaths {
		t.Run(p, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, p, http.NoBody)
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)
			// Must not serve the sensitive file (200 with its content).
			if rec.Code == http.StatusOK && rec.Body.String() == "sensitive" {
				t.Errorf("path traversal served sensitive file via %s", p)
			}
		})
	}
}
