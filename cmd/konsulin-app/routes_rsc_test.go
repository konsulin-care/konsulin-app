package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

// TestRoutes_protectedPage_servesRscPayloadWithoutAuth verifies that internal
// Next.js RSC payloads (e.g., __next._tree.txt) under protected routes are
// served without authentication. The auth guard applies only to HTML pages,
// not to static assets used by the client-side router.
func TestRoutes_protectedPage_servesRscPayloadWithoutAuth(t *testing.T) {

	tmpDir := t.TempDir()
	outDir := filepath.Join(tmpDir, "out")
	recordDir := filepath.Join(outDir, "record")
	if err := os.MkdirAll(recordDir, 0700); err != nil {
		t.Fatalf("mkdir out/record: %v", err)
	}

	// Create the HTML page (should be protected)
	if err := os.WriteFile(filepath.Join(recordDir, "edit.html"), []byte("<html>record edit</html>"), 0644); err != nil {
		t.Fatalf("write edit.html: %v", err)
	}

	// Create RSC payloads (should be served without auth)
	rscPayloads := map[string]string{
		"__next._tree.txt":                      "route tree data",
		"__next.record.__PAGE__.txt":            "page payload",
		"__next._full.txt":                      "full payload",
	}
	for name, content := range rscPayloads {
		if err := os.WriteFile(filepath.Join(recordDir, name), []byte(content), 0644); err != nil {
			t.Fatalf("write %s: %v", name, err)
		}
	}

	t.Chdir(tmpDir)

	csrfKey := "01234567890123456789012345678901"
	cfg := newTestConfig(t, csrfKey)
	cfg.NextjsURL = "http://localhost:9999"

	handler, err := routes(cfg)
	if err != nil {
		t.Fatalf("routes() failed: %v", err)
	}

	tests := []struct {
		name       string
		path       string
		wantCode   int
		wantBody   string
	}{
		{
			name:     "rsc tree payload served without auth",
			path:     "/record/__next._tree.txt",
			wantCode: http.StatusOK,
			wantBody: "route tree data",
		},
		{
			name:     "rsc page payload served without auth",
			path:     "/record/__next.record.__PAGE__.txt",
			wantCode: http.StatusOK,
			wantBody: "page payload",
		},
		{
			name:     "rsc full payload served without auth",
			path:     "/record/__next._full.txt",
			wantCode: http.StatusOK,
			wantBody: "full payload",
		},
		{
			name:     "rsc payload with query string",
			path:     "/record/__next._tree.txt?_rsc=abc123",
			wantCode: http.StatusOK,
			wantBody: "route tree data",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tt.path, http.NoBody)
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			if rec.Code != tt.wantCode {
				t.Errorf("expected status %d, got %d", tt.wantCode, rec.Code)
			}
			if tt.wantBody != "" && rec.Body.String() != tt.wantBody {
				t.Errorf("expected body %q, got %q", tt.wantBody, rec.Body.String())
			}
		})
	}
}

// TestRoutes_protectedPage_htmlRequiresAuth verifies that HTML pages under
// protected routes still require authentication.
func TestRoutes_protectedPage_htmlRequiresAuth(t *testing.T) {

	tmpDir := t.TempDir()
	outDir := filepath.Join(tmpDir, "out")
	recordDir := filepath.Join(outDir, "record")
	if err := os.MkdirAll(recordDir, 0700); err != nil {
		t.Fatalf("mkdir out/record: %v", err)
	}

	if err := os.WriteFile(filepath.Join(recordDir, "edit.html"), []byte("<html>record edit</html>"), 0644); err != nil {
		t.Fatalf("write edit.html: %v", err)
	}

	t.Chdir(tmpDir)

	csrfKey := "01234567890123456789012345678901"
	cfg := newTestConfig(t, csrfKey)
	cfg.NextjsURL = "http://localhost:9999"

	handler, err := routes(cfg)
	if err != nil {
		t.Fatalf("routes() failed: %v", err)
	}

	// Unauthenticated request to HTML page should redirect
	req := httptest.NewRequest(http.MethodGet, "/record/edit", http.NoBody)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusFound {
		t.Errorf("expected 302 redirect for unauthenticated HTML, got %d", rec.Code)
	}
	location := rec.Header().Get("Location")
	if location == "" {
		t.Error("expected Location header on redirect")
	}
}

// TestRoutes_protectedPage_nestedRoute_htmlRequiresAuth verifies that
// nested HTML routes under protected paths require auth.
func TestRoutes_protectedPage_nestedRoute_htmlRequiresAuth(t *testing.T) {

	tmpDir := t.TempDir()
	outDir := filepath.Join(tmpDir, "out")
	recordDir := filepath.Join(outDir, "record", "edit")
	if err := os.MkdirAll(recordDir, 0700); err != nil {
		t.Fatalf("mkdir out/record/edit: %v", err)
	}

	if err := os.WriteFile(filepath.Join(recordDir, "index.html"), []byte("<html>record edit nested</html>"), 0644); err != nil {
		t.Fatalf("write index.html: %v", err)
	}

	t.Chdir(tmpDir)

	csrfKey := "01234567890123456789012345678901"
	cfg := newTestConfig(t, csrfKey)
	cfg.NextjsURL = "http://localhost:9999"

	handler, err := routes(cfg)
	if err != nil {
		t.Fatalf("routes() failed: %v", err)
	}

	// Unauthenticated request to nested HTML page should redirect
	req := httptest.NewRequest(http.MethodGet, "/record/edit", http.NoBody)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusFound {
		t.Errorf("expected 302 redirect for unauthenticated nested HTML, got %d", rec.Code)
	}
}
