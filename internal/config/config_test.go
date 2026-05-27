package config

import (
	"os"
	"testing"
)

// saveEnv saves the current value of an env var and restores it on test cleanup.
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

func TestLoad_defaultPort(t *testing.T) {
	saveEnv(t, "PORT")
	if err := os.Unsetenv("PORT"); err != nil {
		t.Fatalf("unset PORT: %v", err)
	}
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned error: %v", err)
	}
	if cfg.Port != "8080" {
		t.Errorf("expected default port 8080, got %q", cfg.Port)
	}
}

func TestLoad_customPort(t *testing.T) {
	saveEnv(t, "PORT")
	if err := os.Setenv("PORT", "9090"); err != nil {
		t.Fatalf("set PORT=9090: %v", err)
	}
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned error: %v", err)
	}
	if cfg.Port != "9090" {
		t.Errorf("expected port 9090, got %q", cfg.Port)
	}
}

func TestMustEnv_present(t *testing.T) {
	saveEnv(t, "TEST_VAR")
	if err := os.Setenv("TEST_VAR", "hello"); err != nil {
		t.Fatalf("set TEST_VAR=hello: %v", err)
	}
	val, err := MustEnv("TEST_VAR")
	if err != nil {
		t.Fatalf("MustEnv() returned error: %v", err)
	}
	if val != "hello" {
		t.Errorf("expected 'hello', got %q", val)
	}
}

func TestMustEnv_missing(t *testing.T) {
	saveEnv(t, "TEST_VAR_MISSING")
	if err := os.Unsetenv("TEST_VAR_MISSING"); err != nil {
		t.Fatalf("unset TEST_VAR_MISSING: %v", err)
	}
	_, err := MustEnv("TEST_VAR_MISSING")
	if err == nil {
		t.Fatal("expected error for missing env var, got nil")
	}
}
