package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestStaticOrProxy_servesStaticFileWhenExists(t *testing.T) {
	t.Parallel()
	tmpDir := t.TempDir()
	content := "<html><body>record page</body></html>"
	if err := os.WriteFile(filepath.Join(tmpDir, "record.html"), []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	proxied := false
	proxy := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		proxied = true
		w.WriteHeader(http.StatusOK)
	})

	handler := staticOrProxy(tmpDir, proxy)

	req := httptest.NewRequest(http.MethodGet, "/record", http.NoBody)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	if rec.Body.String() != content {
		t.Errorf("expected body %q, got %q", content, rec.Body.String())
	}
	if proxied {
		t.Error("expected static file served, but proxy was called")
	}
}

func TestStaticOrProxy_proxiesWhenFileMissing(t *testing.T) {
	t.Parallel()
	tmpDir := t.TempDir()

	proxied := false
	proxy := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		proxied = true
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("from proxy"))
	})

	handler := staticOrProxy(tmpDir, proxy)

	req := httptest.NewRequest(http.MethodGet, "/missing-page", http.NoBody)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	if !proxied {
		t.Error("expected proxy to be called when static file missing")
	}
	if rec.Body.String() != "from proxy" {
		t.Errorf("expected body 'from proxy', got %q", rec.Body.String())
	}
}

func TestStaticOrProxy_proxiesSubPathWhenNoStaticMatch(t *testing.T) {
	t.Parallel()
	tmpDir := t.TempDir()
	content := "<html><body>record page</body></html>"
	if err := os.WriteFile(filepath.Join(tmpDir, "record.html"), []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	proxied := false
	proxy := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		proxied = true
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("from proxy"))
	})

	handler := staticOrProxy(tmpDir, proxy)

	req := httptest.NewRequest(http.MethodGet, "/record/some-sub-path", http.NoBody)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	if !proxied {
		t.Error("expected proxy to be called for sub-path without static file")
	}
}

func TestStaticOrProxy_preservesQueryString(t *testing.T) {
	t.Parallel()
	tmpDir := t.TempDir()
	content := "<html><body>record page</body></html>"
	if err := os.WriteFile(filepath.Join(tmpDir, "record.html"), []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	proxied := false
	proxy := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		proxied = true
	})

	handler := staticOrProxy(tmpDir, proxy)

	req := httptest.NewRequest(http.MethodGet, "/record?view=Observation/123", http.NoBody)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	if rec.Body.String() != content {
		t.Errorf("expected body %q, got %q", content, rec.Body.String())
	}
	if proxied {
		t.Error("expected static file served, but proxy was called")
	}
}

func TestStaticOrProxy_servesMethodAgnostic(t *testing.T) {
	t.Parallel()
	tmpDir := t.TempDir()
	content := "<html><body>record page</body></html>"
	if err := os.WriteFile(filepath.Join(tmpDir, "record.html"), []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	proxied := false
	proxy := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		proxied = true
	})

	handler := staticOrProxy(tmpDir, proxy)

	for _, method := range []string{http.MethodGet, http.MethodHead} {
		t.Run(method, func(t *testing.T) {
			req := httptest.NewRequest(method, "/record", http.NoBody)
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			if rec.Code != http.StatusOK {
				t.Errorf("expected 200, got %d", rec.Code)
			}
			if proxied {
				t.Error("expected static file served, but proxy was called")
			}
		})
	}
}
