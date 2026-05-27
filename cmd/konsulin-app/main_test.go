package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/konsulin-care/konsulin-app/internal/config"
)

func TestHealthEndpoint(t *testing.T) {
	saveEnv(t, "API_URL")
	saveEnv(t, "APP_URL")
	saveEnv(t, "TX_URL")
	if err := os.Setenv("API_URL", "http://test:3200"); err != nil {
		t.Fatalf("set API_URL: %v", err)
	}
	if err := os.Setenv("APP_URL", "http://test:3000"); err != nil {
		t.Fatalf("set APP_URL: %v", err)
	}
	if err := os.Setenv("TX_URL", "http://test:3300"); err != nil {
		t.Fatalf("set TX_URL: %v", err)
	}

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("config.Load() failed: %v", err)
	}
	handler := routes(cfg)
	server := httptest.NewServer(handler)
	defer server.Close()

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

func saveEnv(t *testing.T, key string) {
	t.Helper()
	orig, wasSet := os.LookupEnv(key)
	t.Cleanup(func() {
		if wasSet {
			if err := os.Setenv(key, orig); err != nil {
				t.Fatalf("restore %s: %v", key, err)
			}
		} else {
			if err := os.Unsetenv(key); err != nil {
				t.Fatalf("restore %s (unset): %v", key, err)
			}
		}
	})
}
