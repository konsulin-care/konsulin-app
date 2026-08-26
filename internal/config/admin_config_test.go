package config

import (
	"os"
	"testing"
)

// TestLoad_defaultSuperadminKeyCookieName verifies the BFF-held superadmin key
// cookie defaults to "superadmin_key" when the env var is unset.
func TestLoad_defaultSuperadminKeyCookieName(t *testing.T) {
	setRequiredEnv(t)
	setCloudinaryEnv(t, "test-cloud", "test-preset")
	saveEnv(t, "SUPERADMIN_KEY_COOKIE_NAME")
	if err := os.Unsetenv("SUPERADMIN_KEY_COOKIE_NAME"); err != nil {
		t.Fatalf("unset SUPERADMIN_KEY_COOKIE_NAME: %v", err)
	}
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned error: %v", err)
	}
	if cfg.SuperadminKeyCookieName != "superadmin_key" {
		t.Errorf("expected default 'superadmin_key', got %q", cfg.SuperadminKeyCookieName)
	}
}

// TestLoad_customSuperadminKeyCookieName verifies the env var override takes
// effect.
func TestLoad_customSuperadminKeyCookieName(t *testing.T) {
	setRequiredEnv(t)
	setCloudinaryEnv(t, "test-cloud", "test-preset")
	t.Setenv("SUPERADMIN_KEY_COOKIE_NAME", "sa_admin_key")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned error: %v", err)
	}
	if cfg.SuperadminKeyCookieName != "sa_admin_key" {
		t.Errorf("expected 'sa_admin_key', got %q", cfg.SuperadminKeyCookieName)
	}
}