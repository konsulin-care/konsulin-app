package config

import (
	"os"
	"testing"
)

func TestLoad_defaultPort(t *testing.T) {
	orig := os.Getenv("PORT")
	t.Cleanup(func() { os.Setenv("PORT", orig) })
	os.Unsetenv("PORT")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned error: %v", err)
	}
	if cfg.Port != "8080" {
		t.Errorf("expected default port 8080, got %q", cfg.Port)
	}
}

func TestLoad_customPort(t *testing.T) {
	orig := os.Getenv("PORT")
	t.Cleanup(func() { os.Setenv("PORT", orig) })
	os.Setenv("PORT", "9090")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned error: %v", err)
	}
	if cfg.Port != "9090" {
		t.Errorf("expected port 9090, got %q", cfg.Port)
	}
}

func TestMustEnv_present(t *testing.T) {
	os.Setenv("TEST_VAR", "hello")
	defer os.Unsetenv("TEST_VAR")
	val, err := MustEnv("TEST_VAR")
	if err != nil {
		t.Fatalf("MustEnv() returned error: %v", err)
	}
	if val != "hello" {
		t.Errorf("expected 'hello', got %q", val)
	}
}

func TestMustEnv_missing(t *testing.T) {
	os.Unsetenv("TEST_VAR_MISSING")
	_, err := MustEnv("TEST_VAR_MISSING")
	if err == nil {
		t.Fatal("expected error for missing env var, got nil")
	}
}
