package config

import (
	"os"
	"testing"
)

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

func setRequiredEnv(t *testing.T) {
	t.Helper()
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
}

func TestLoad_defaultPort(t *testing.T) {
	setRequiredEnv(t)
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
	setRequiredEnv(t)
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

func TestLoad_defaultAppName(t *testing.T) {
	setRequiredEnv(t)
	saveEnv(t, "APP_NAME")
	if err := os.Unsetenv("APP_NAME"); err != nil {
		t.Fatalf("unset APP_NAME: %v", err)
	}
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned error: %v", err)
	}
	if cfg.AppName != "Konsulin" {
		t.Errorf("expected default AppName 'Konsulin', got %q", cfg.AppName)
	}
}

func TestLoad_customAppName(t *testing.T) {
	setRequiredEnv(t)
	saveEnv(t, "APP_NAME")
	if err := os.Setenv("APP_NAME", "TestApp"); err != nil {
		t.Fatalf("set APP_NAME=TestApp: %v", err)
	}
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned error: %v", err)
	}
	if cfg.AppName != "TestApp" {
		t.Errorf("expected AppName 'TestApp', got %q", cfg.AppName)
	}
}

func TestLoad_defaultApiBasePath(t *testing.T) {
	setRequiredEnv(t)
	saveEnv(t, "API_BASE_PATH")
	if err := os.Unsetenv("API_BASE_PATH"); err != nil {
		t.Fatalf("unset API_BASE_PATH: %v", err)
	}
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned error: %v", err)
	}
	if cfg.APIBasePath != "/api/v1" {
		t.Errorf("expected default APIBasePath '/api/v1', got %q", cfg.APIBasePath)
	}
}

func TestLoad_customApiBasePath(t *testing.T) {
	setRequiredEnv(t)
	saveEnv(t, "API_BASE_PATH")
	if err := os.Setenv("API_BASE_PATH", "/custom/v2"); err != nil {
		t.Fatalf("set API_BASE_PATH=/custom/v2: %v", err)
	}
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned error: %v", err)
	}
	if cfg.APIBasePath != "/custom/v2" {
		t.Errorf("expected APIBasePath '/custom/v2', got %q", cfg.APIBasePath)
	}
}

func TestLoad_defaultAuthPath(t *testing.T) {
	setRequiredEnv(t)
	saveEnv(t, "AUTH_PATH")
	if err := os.Unsetenv("AUTH_PATH"); err != nil {
		t.Fatalf("unset AUTH_PATH: %v", err)
	}
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned error: %v", err)
	}
	if cfg.AuthPath != "/auth" {
		t.Errorf("expected default AuthPath '/auth', got %q", cfg.AuthPath)
	}
}

func TestLoad_customAuthPath(t *testing.T) {
	setRequiredEnv(t)
	saveEnv(t, "AUTH_PATH")
	if err := os.Setenv("AUTH_PATH", "/signin"); err != nil {
		t.Fatalf("set AUTH_PATH=/signin: %v", err)
	}
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned error: %v", err)
	}
	if cfg.AuthPath != "/signin" {
		t.Errorf("expected AuthPath '/signin', got %q", cfg.AuthPath)
	}
}

func TestAuthFullPath(t *testing.T) {
	setRequiredEnv(t)
	saveEnv(t, "API_BASE_PATH")
	saveEnv(t, "AUTH_PATH")
	if err := os.Setenv("API_BASE_PATH", "/api/v2"); err != nil {
		t.Fatalf("set API_BASE_PATH=/api/v2: %v", err)
	}
	if err := os.Setenv("AUTH_PATH", "/login"); err != nil {
		t.Fatalf("set AUTH_PATH=/login: %v", err)
	}
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned error: %v", err)
	}
	expected := "/api/v2/login"
	if got := cfg.AuthFullPath(); got != expected {
		t.Errorf("expected AuthFullPath %q, got %q", expected, got)
	}
}

func TestLoad_missingRequired(t *testing.T) {
	saveEnv(t, "API_URL")
	saveEnv(t, "APP_URL")
	saveEnv(t, "TX_URL")
	if err := os.Unsetenv("API_URL"); err != nil {
		t.Fatalf("unset API_URL: %v", err)
	}
	if err := os.Unsetenv("APP_URL"); err != nil {
		t.Fatalf("unset APP_URL: %v", err)
	}
	if err := os.Unsetenv("TX_URL"); err != nil {
		t.Fatalf("unset TX_URL: %v", err)
	}

	if os.Getenv("API_URL") != "" || os.Getenv("APP_URL") != "" || os.Getenv("TX_URL") != "" {
		t.Fatal("required env vars not properly unset")
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
