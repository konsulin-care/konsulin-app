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
	t.Setenv("API_URL", "http://test:3200")
	t.Setenv("APP_URL", "http://test:3000")
	t.Setenv("SESSION_COOKIE_SECRET", "test-secret-value")
}

func setCloudinaryEnv(t *testing.T, cloudName, preset string) {
	t.Helper()
	t.Setenv("CLOUDINARY_CLOUD_NAME", cloudName)
	t.Setenv("CLOUDINARY_UPLOAD_PRESET", preset)
}

func TestLoad_defaultPort(t *testing.T) {
	setRequiredEnv(t)
	setCloudinaryEnv(t, "test-cloud", "test-preset")
	saveEnv(t, "PORT")
	if err := os.Unsetenv("PORT"); err != nil {
		t.Fatalf("unset PORT: %v", err)
	}
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned error: %v", err)
	}
	if cfg.Port != "3000" {
		t.Errorf("expected default port 3000, got %q", cfg.Port)
	}
}

func TestLoad_customPort(t *testing.T) {
	setRequiredEnv(t)
	setCloudinaryEnv(t, "test-cloud", "test-preset")
	t.Setenv("PORT", "9090")
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
	setCloudinaryEnv(t, "test-cloud", "test-preset")
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
	setCloudinaryEnv(t, "test-cloud", "test-preset")
	t.Setenv("APP_NAME", "TestApp")
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
	setCloudinaryEnv(t, "test-cloud", "test-preset")
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
	setCloudinaryEnv(t, "test-cloud", "test-preset")
	t.Setenv("API_BASE_PATH", "/custom/v2")
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
	setCloudinaryEnv(t, "test-cloud", "test-preset")
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
	setCloudinaryEnv(t, "test-cloud", "test-preset")
	t.Setenv("AUTH_PATH", "/signin")
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
	setCloudinaryEnv(t, "test-cloud", "test-preset")
	t.Setenv("API_BASE_PATH", "/api/v2")
	t.Setenv("AUTH_PATH", "/login")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned error: %v", err)
	}
	expected := "/api/v2/login"
	if got := cfg.AuthFullPath(); got != expected {
		t.Errorf("expected AuthFullPath %q, got %q", expected, got)
	}
}

func TestEnvUnset_clearsRequiredVars(t *testing.T) {
	saveEnv(t, "API_URL")
	saveEnv(t, "APP_URL")
	if err := os.Unsetenv("API_URL"); err != nil {
		t.Fatalf("unset API_URL: %v", err)
	}
	if err := os.Unsetenv("APP_URL"); err != nil {
		t.Fatalf("unset APP_URL: %v", err)
	}

	// nolint:usetesting // os.Getenv used for env var cleanup verification, not test isolation
	if os.Getenv("API_URL") != "" || os.Getenv("APP_URL") != "" {
		t.Fatal("required env vars not properly unset")
	}
}

func TestLoad_cloudinaryConfig(t *testing.T) {
	setRequiredEnv(t)
	setCloudinaryEnv(t, "test-cloud", "test-preset")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned error: %v", err)
	}
	if cfg.CloudinaryCloudName != "test-cloud" {
		t.Errorf("expected CloudinaryCloudName 'test-cloud', got %q", cfg.CloudinaryCloudName)
	}
	if cfg.CloudinaryUploadPreset != "test-preset" {
		t.Errorf("expected CloudinaryUploadPreset 'test-preset', got %q", cfg.CloudinaryUploadPreset)
	}
}

func TestLoad_missingCloudinaryCloudNameReturnsError(t *testing.T) {
	setRequiredEnv(t)
	saveEnv(t, "CLOUDINARY_CLOUD_NAME")
	if err := os.Unsetenv("CLOUDINARY_CLOUD_NAME"); err != nil {
		t.Fatalf("unset CLOUDINARY_CLOUD_NAME: %v", err)
	}
	setCloudinaryEnv(t, "", "test-preset")
	_, err := Load()
	if err == nil {
		t.Fatal("expected error for missing CLOUDINARY_CLOUD_NAME, got nil")
	}
}

func TestLoad_missingCloudinaryUploadPresetReturnsError(t *testing.T) {
	setRequiredEnv(t)
	saveEnv(t, "CLOUDINARY_UPLOAD_PRESET")
	if err := os.Unsetenv("CLOUDINARY_UPLOAD_PRESET"); err != nil {
		t.Fatalf("unset CLOUDINARY_UPLOAD_PRESET: %v", err)
	}
	setCloudinaryEnv(t, "test-cloud", "")
	_, err := Load()
	if err == nil {
		t.Fatal("expected error for missing CLOUDINARY_UPLOAD_PRESET, got nil")
	}
}

func TestLoad_missingRequiredReturnsError(t *testing.T) {
	setRequiredEnv(t)
	saveEnv(t, "SESSION_COOKIE_SECRET")
	if err := os.Unsetenv("SESSION_COOKIE_SECRET"); err != nil {
		t.Fatalf("unset SESSION_COOKIE_SECRET: %v", err)
	}
	_, err := Load()
	if err == nil {
		t.Fatal("expected error for missing required env var, got nil")
	}
}

func TestMustEnv_present(t *testing.T) {
	t.Setenv("TEST_VAR", "hello")
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

func TestLoad_dotenvFile(t *testing.T) {
	tdir := t.TempDir()
	envContent := []byte("CLOUDINARY_CLOUD_NAME=from-dotenv\nCLOUDINARY_UPLOAD_PRESET=from-dotenv-preset\n")
	if err := os.WriteFile(tdir+"/.env", envContent, 0644); err != nil {
		t.Fatalf("write .env: %v", err)
	}
	t.Chdir(tdir)

	setRequiredEnv(t)
	saveEnv(t, "CLOUDINARY_CLOUD_NAME")
	if err := os.Unsetenv("CLOUDINARY_CLOUD_NAME"); err != nil {
		t.Fatalf("unset CLOUDINARY_CLOUD_NAME: %v", err)
	}
	saveEnv(t, "CLOUDINARY_UPLOAD_PRESET")
	if err := os.Unsetenv("CLOUDINARY_UPLOAD_PRESET"); err != nil {
		t.Fatalf("unset CLOUDINARY_UPLOAD_PRESET: %v", err)
	}

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() with .env should succeed, got: %v", err)
	}
	if cfg.CloudinaryCloudName != "from-dotenv" {
		t.Errorf("expected CloudinaryCloudName 'from-dotenv', got %q", cfg.CloudinaryCloudName)
	}
	if cfg.CloudinaryUploadPreset != "from-dotenv-preset" {
		t.Errorf("expected CloudinaryUploadPreset 'from-dotenv-preset', got %q", cfg.CloudinaryUploadPreset)
	}
}
