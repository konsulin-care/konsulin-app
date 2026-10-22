package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func testSPAFSOpen(t *testing.T, fileName, openPath, want string, wantErr bool) {
	t.Helper()
	tmpDir := t.TempDir()
	if fileName != "" {
		if err := os.WriteFile(filepath.Join(tmpDir, fileName), []byte(want), 0644); err != nil {
			t.Fatal(err)
		}
	}
	fs := &spaFS{http.Dir(tmpDir)}
	f, err := fs.Open(openPath)
	if wantErr {
		if err == nil {
			t.Fatal("expected error")
		}
		if !os.IsNotExist(err) {
			t.Errorf("expected ErrNotExist, got %v", err)
		}
		return
	}
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	defer f.Close()
	buf := make([]byte, len(want))
	_, _ = f.Read(buf)
	if string(buf) != want {
		t.Errorf("expected %q, got %q", want, string(buf))
	}
}

func TestSPAFS_servesExactPath(t *testing.T) {
	t.Parallel()
	testSPAFSOpen(t, "existing.html", "/existing.html", "exact match", false)
}

func TestSPAFS_fallsBackToHtml(t *testing.T) {
	t.Parallel()
	testSPAFSOpen(t, "clinic.html", "/clinic", "html fallback", false)
}

func TestSPAFS_returns404WhenMissing(t *testing.T) {
	t.Parallel()
	testSPAFSOpen(t, "", "/nonexistent", "", true)
}

func TestSPAFS_servesPathsWithExtensionDirectly(t *testing.T) {
	t.Parallel()
	tmpDir := t.TempDir()
	content := "favicon data"
	if err := os.WriteFile(filepath.Join(tmpDir, "favicon.ico"), []byte(content), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tmpDir, "favicon.ico.html"), []byte("wrong"), 0644); err != nil {
		t.Fatal(err)
	}

	fs := &spaFS{http.Dir(tmpDir)}
	f, err := fs.Open("/favicon.ico")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	defer f.Close()

	buf := make([]byte, len(content))
	_, _ = f.Read(buf)
	if string(buf) != content {
		t.Errorf("expected %q, got %q", content, string(buf))
	}
}

func TestSPAFS_allowsDirectoryForAssetSubpaths(t *testing.T) {
	t.Parallel()
	tmpDir := t.TempDir()
	dirPath := filepath.Join(tmpDir, "_next", "static", "chunks")
	if err := os.MkdirAll(dirPath, 0700); err != nil {
		t.Fatal(err)
	}
	content := "chunk content"
	if err := os.WriteFile(filepath.Join(dirPath, "app-page.js"), []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	fs := &spaFS{http.Dir(tmpDir)}
	f, err := fs.Open("/_next/static/chunks/app-page.js")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	defer f.Close()

	buf := make([]byte, len(content))
	_, _ = f.Read(buf)
	if string(buf) != content {
		t.Errorf("expected %q, got %q", content, string(buf))
	}
}

func TestRoutes_servesCleanUrl(t *testing.T) {
	tmpDir := t.TempDir()
	outDir := filepath.Join(tmpDir, "out")
	if err := os.MkdirAll(outDir, 0700); err != nil {
		t.Fatalf("mkdir out: %v", err)
	}
	content := "<html><body>clinic page</body></html>"
	if err := os.WriteFile(filepath.Join(outDir, "clinic.html"), []byte(content), 0644); err != nil {
		t.Fatalf("write clinic.html: %v", err)
	}

	t.Chdir(tmpDir)

	csrfKey := "01234567890123456789012345678901"
	cfg := newTestConfig(t, csrfKey)
	cfg.NextjsURL = "http://localhost:9999"

	handler, err := routes(cfg)
	if err != nil {
		t.Fatalf("routes() failed: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/clinic", http.NoBody)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200 for /clinic, got %d", rec.Code)
	}
	if rec.Body.String() != content {
		t.Errorf("expected body %q, got %q", content, rec.Body.String())
	}
}

func TestRoutes_cleanUrlNotFound(t *testing.T) {
	tmpDir := t.TempDir()
	outDir := filepath.Join(tmpDir, "out")
	if err := os.MkdirAll(outDir, 0700); err != nil {
		t.Fatalf("mkdir out: %v", err)
	}
	if err := os.WriteFile(filepath.Join(outDir, "404.html"), []byte("not found"), 0644); err != nil {
		t.Fatalf("write 404.html: %v", err)
	}

	t.Chdir(tmpDir)

	csrfKey := "01234567890123456789012345678901"
	cfg := newTestConfig(t, csrfKey)
	cfg.NextjsURL = "http://localhost:9999"

	handler, err := routes(cfg)
	if err != nil {
		t.Fatalf("routes() failed: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/nonexistent", http.NoBody)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Errorf("expected 404 for /nonexistent, got %d", rec.Code)
	}
}
