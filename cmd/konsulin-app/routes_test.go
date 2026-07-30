package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"testing"

	"github.com/konsulin-care/konsulin-app/internal/config"
	"github.com/konsulin-care/konsulin-app/internal/session"
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
	tmpDir := t.TempDir()
	outDir := filepath.Join(tmpDir, "out")
	if err := os.MkdirAll(outDir, 0755); err != nil {
		t.Fatalf("mkdir out: %v", err)
	}
	testContent := "hello from nextjs"
	testFile := filepath.Join(outDir, "test-page.html")
	if err := os.WriteFile(testFile, []byte(testContent), 0644); err != nil {
		t.Fatalf("write test file: %v", err)
	}

	t.Chdir(tmpDir)

	csrfKey := "01234567890123456789012345678901"
	cfg := newTestConfig(t, csrfKey)
	cfg.NextjsURL = "http://localhost:9999"

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

func setupAuthTest(t *testing.T, authContent string) http.Handler {
	t.Helper()
	tmpDir := t.TempDir()
	outDir := filepath.Join(tmpDir, "out")
	if err := os.MkdirAll(outDir, 0755); err != nil {
		t.Fatalf("mkdir out: %v", err)
	}
	authFile := filepath.Join(outDir, "auth.html")
	if err := os.WriteFile(authFile, []byte(authContent), 0644); err != nil {
		t.Fatalf("write auth.html: %v", err)
	}
	t.Chdir(tmpDir)

	csrfKey := "01234567890123456789012345678901"
	cfg := newTestConfig(t, csrfKey)
	cfg.NextjsURL = "http://localhost:9999"
	cfg.AppURL = "http://test:3000"

	handler, err := routes(cfg)
	if err != nil {
		t.Fatalf("routes() failed: %v", err)
	}
	return handler
}

func TestRoutes_authHtml_servesForSubRoutes(t *testing.T) {
	authContent := "<html><body>auth page</body></html>"
	handler := setupAuthTest(t, authContent)

	tests := []struct {
		name string
		path string
	}{
		{"root", "/auth"},
		{"verify with query", "/auth/verify?preAuthSessionId=test-session"},
		{"callback/google", "/auth/callback/google"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tt.path, http.NoBody)
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			if rec.Code != http.StatusOK {
				t.Errorf("expected 200, got %d", rec.Code)
			}
			if rec.Body.String() != authContent {
				t.Errorf("expected body %q, got %q", authContent, rec.Body.String())
			}
		})
	}
}

func TestRoutes_authVerify_proxiesWhenOutMissing(t *testing.T) {
	tmpDir := t.TempDir()
	t.Chdir(tmpDir)

	csrfKey := "01234567890123456789012345678901"
	cfg := newTestConfig(t, csrfKey)
	cfg.NextjsURL = "http://127.0.0.1:19999"
	cfg.AppURL = "http://test:3000"

	handler, err := routes(cfg)
	if err != nil {
		t.Fatalf("routes() failed: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/auth/verify?preAuthSessionId=test", http.NoBody)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadGateway {
		t.Errorf("expected 502 on unreachable proxy, got %d", rec.Code)
	}
}

func TestRoutes_auth_redirectsAuthenticated(t *testing.T) {
	authContent := "<html><body>auth page</body></html>"
	handler := setupAuthTest(t, authContent)

	session.InitSecureCookie("test-secret-value")
	session.AllowUnsigned = false

	sess := session.Session{
		UserID:          "u1",
		Roles:           []string{"Patient"},
		Role:            "Patient",
		ProfileComplete: true,
	}
	sessJSON, err := json.Marshal(sess)
	if err != nil {
		t.Fatalf("marshal session: %v", err)
	}
	cookieVal := url.QueryEscape(session.SignCookieValue(string(sessJSON), "test-secret-value"))

	req := httptest.NewRequest(http.MethodGet, "/auth", http.NoBody)
	req.Header.Set("Cookie", "auth="+cookieVal)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusFound {
		t.Errorf("expected 302, got %d", rec.Code)
	}
	location := rec.Header().Get("Location")
	if location != "/" {
		t.Errorf("expected Location /, got %q", location)
	}
}

func TestRoutes_outDirMissing_fallsBackToProxy(t *testing.T) {
	tmpDir := t.TempDir()
	t.Chdir(tmpDir)

	csrfKey := "01234567890123456789012345678901"
	cfg := newTestConfig(t, csrfKey)
	cfg.NextjsURL = "http://127.0.0.1:19999"

	handler, err := routes(cfg)
	if err != nil {
		t.Fatalf("routes() failed: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/some-page", http.NoBody)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadGateway {
		t.Errorf("expected 502 on unreachable proxy, got %d", rec.Code)
	}
}
