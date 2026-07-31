package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestRoutes_result_isNotProtected(t *testing.T) {
	tmpDir := t.TempDir()
	outDir := filepath.Join(tmpDir, "out")
	if err := os.MkdirAll(outDir, 0755); err != nil {
		t.Fatalf("mkdir out: %v", err)
	}
	testContent := "result page content"
	testFile := filepath.Join(outDir, "result.html")
	if err := os.WriteFile(testFile, []byte(testContent), 0644); err != nil {
		t.Fatalf("write result.html: %v", err)
	}
	t.Chdir(tmpDir)

	csrfKey := "01234567890123456789012345678901"
	cfg := newTestConfig(t, csrfKey)
	cfg.NextjsURL = "http://localhost:9999"

	handler, err := routes(cfg)
	if err != nil {
		t.Fatalf("routes() failed: %v", err)
	}

	// /result must not be redirected to /auth (no AuthGuard)
	req := httptest.NewRequest(http.MethodGet, "/result", http.NoBody)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code == http.StatusFound || rec.Code == http.StatusSeeOther {
		t.Errorf("/result must not redirect, got %d Location: %s", rec.Code, rec.Header().Get("Location"))
	}
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	if rec.Body.String() != testContent {
		t.Errorf("expected body %q, got %q", testContent, rec.Body.String())
	}
}

func TestRoutes_result_subPathsAreNotProtected(t *testing.T) {
	tmpDir := t.TempDir()
	outDir := filepath.Join(tmpDir, "out")
	if err := os.MkdirAll(outDir, 0755); err != nil {
		t.Fatalf("mkdir out: %v", err)
	}
	testFile := filepath.Join(outDir, "result.html")
	if err := os.WriteFile(testFile, []byte("result page"), 0644); err != nil {
		t.Fatalf("write result.html: %v", err)
	}
	t.Chdir(tmpDir)

	csrfKey := "01234567890123456789012345678901"
	cfg := newTestConfig(t, csrfKey)
	cfg.NextjsURL = "http://localhost:9999"

	handler, err := routes(cfg)
	if err != nil {
		t.Fatalf("routes() failed: %v", err)
	}

	// /result with query params must not redirect
	req := httptest.NewRequest(http.MethodGet, "/result?id=test-qr-id", http.NoBody)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code == http.StatusFound || rec.Code == http.StatusSeeOther {
		t.Errorf("/result?id=... must not redirect, got %d Location: %s", rec.Code, rec.Header().Get("Location"))
	}
}
