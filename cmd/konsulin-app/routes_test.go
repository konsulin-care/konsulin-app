package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/konsulin-care/konsulin-app/internal/config"
)

func setRequiredEnv(t *testing.T) {
	t.Helper()
	t.Setenv("API_URL", "http://test:3200")
	t.Setenv("APP_URL", "http://test:3000")
	t.Setenv("TX_URL", "http://test:3300")
	t.Setenv("SESSION_COOKIE_SECRET", "test-secret-value")
	t.Setenv("CLOUDINARY_CLOUD_NAME", "test-cloud")
	t.Setenv("CLOUDINARY_UPLOAD_PRESET", "test-preset")
}

func newTestConfig(t *testing.T, csrfKey string) *config.Config {
	t.Helper()
	setRequiredEnv(t)
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("config.Load() failed: %v", err)
	}
	cfg.CSRFAuthKey = csrfKey
	cfg.CookieSecure = false
	return cfg
}

func TestRoutes_servesOutDir(t *testing.T) {
	// Create a temporary directory with an out/ subdirectory
	tmpDir := t.TempDir()
	outDir := filepath.Join(tmpDir, "out")
	if err := os.MkdirAll(outDir, 0755); err != nil {
		t.Fatalf("mkdir out: %v", err)
	}
	// Create a test file in out/
	testContent := "hello from nextjs"
	testFile := filepath.Join(outDir, "test-page.html")
	if err := os.WriteFile(testFile, []byte(testContent), 0644); err != nil {
		t.Fatalf("write test file: %v", err)
	}

	// Change to the temp dir so workingDir() returns it
	t.Chdir(tmpDir)

	// 32-byte CSRF key for valid config
	csrfKey := "01234567890123456789012345678901"
	cfg := newTestConfig(t, csrfKey)
	cfg.NextjsURL = "http://localhost:9999" // ensure proxy points elsewhere

	handler, err := routes(cfg)
	if err != nil {
		t.Fatalf("routes() failed: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/test-page.html", http.NoBody)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	if rec.Body.String() != testContent {
		t.Errorf("expected body %q, got %q", testContent, rec.Body.String())
	}
}

func TestRoutes_outDirMissing_fallsBackToProxy(t *testing.T) {
	tmpDir := t.TempDir()
	// No out/ directory this time
	t.Chdir(tmpDir)

	csrfKey := "01234567890123456789012345678901"
	cfg := newTestConfig(t, csrfKey)
	cfg.NextjsURL = "http://127.0.0.1:19999" // unreachable proxy

	handler, err := routes(cfg)
	if err != nil {
		t.Fatalf("routes() failed: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/some-page", http.NoBody)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	// Proxy is unreachable, should get 502 Bad Gateway
	if rec.Code != http.StatusBadGateway {
		t.Errorf("expected 502 on unreachable proxy, got %d", rec.Code)
	}
}
