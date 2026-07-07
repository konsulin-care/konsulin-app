package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/konsulin-care/konsulin-app/internal/config"
)

func TestHealthEndpoint(t *testing.T) {
	server := newTestServer(t)

	resp, err := http.Get(server.URL + "/health")
	if err != nil {
		t.Fatalf("GET /health failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}

	var body map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if body["status"] != "ok" {
		t.Errorf("expected status 'ok', got '%s'", body["status"])
	}
}

func TestRelayEndpoint_CSRFExempt(t *testing.T) {
	server := newTestServer(t)

	// POST to relay endpoint without CSRF token — should pass CSRF check
	// and reach the handler (which will return 400 due to empty body).
	resp, err := http.Post(server.URL+"/api/v1/relay/booking", "application/json", http.NoBody)
	if err != nil {
		t.Fatalf("POST /api/v1/relay/booking failed: %v", err)
	}
	defer resp.Body.Close()

	// Expect NOT 403 — CSRF exemption should allow the request through.
	// 400 is fine: that means CSRF passed but request body was invalid.
	if resp.StatusCode == http.StatusForbidden {
		t.Errorf("relay endpoint should be CSRF-exempt, got 403")
	}
}

// newTestServer starts a test server using production routes.
func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()

	t.Setenv("API_URL", "http://test:3200")
	t.Setenv("APP_URL", "http://test:3000")
	t.Setenv("TX_URL", "http://test:3300")
	t.Setenv("SESSION_COOKIE_SECRET", "test-secret")
	t.Setenv("CSRF_AUTH_KEY", "dev-csrf-auth-key-32-bytes-long!")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("config.Load() failed: %v", err)
	}
	handler, err := routes(cfg)
	if err != nil {
		t.Fatalf("routes() failed: %v", err)
	}
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)
	return server
}
