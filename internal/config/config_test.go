package config

import (
	"os"
	"testing"
)

func TestLoad_defaultPort(t *testing.T) {
	orig, wasSet := os.LookupEnv("PORT")
	t.Cleanup(func() {
		if wasSet {
			if err := os.Setenv("PORT", orig); err != nil {
				t.Fatalf("restore PORT: %v", err)
			}
		} else {
			if err := os.Unsetenv("PORT"); err != nil {
				t.Fatalf("restore PORT (unset): %v", err)
			}
		}
	})
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
	orig, wasSet := os.LookupEnv("PORT")
	t.Cleanup(func() {
		if wasSet {
			if err := os.Setenv("PORT", orig); err != nil {
				t.Fatalf("restore PORT: %v", err)
			}
		} else {
			if err := os.Unsetenv("PORT"); err != nil {
				t.Fatalf("restore PORT (unset): %v", err)
			}
		}
	})
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
	orig, wasSet := os.LookupEnv("TEST_VAR")
	t.Cleanup(func() {
		if wasSet {
			if err := os.Setenv("TEST_VAR", orig); err != nil {
				t.Fatalf("restore TEST_VAR: %v", err)
			}
		} else {
			if err := os.Unsetenv("TEST_VAR"); err != nil {
				t.Fatalf("restore TEST_VAR (unset): %v", err)
			}
		}
	})
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
	orig, wasSet := os.LookupEnv("TEST_VAR_MISSING")
	t.Cleanup(func() {
		if wasSet {
			if err := os.Setenv("TEST_VAR_MISSING", orig); err != nil {
				t.Fatalf("restore TEST_VAR_MISSING: %v", err)
			}
		}
	})
	if err := os.Unsetenv("TEST_VAR_MISSING"); err != nil {
		t.Fatalf("unset TEST_VAR_MISSING: %v", err)
	}
	_, err := MustEnv("TEST_VAR_MISSING")
	if err == nil {
		t.Fatal("expected error for missing env var, got nil")
	}
}
