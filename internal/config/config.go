// Package config loads and holds runtime configuration from environment variables.
package config

import (
	"fmt"
	"log/slog"
	"os"
)

type Config struct {
	Port        string
	AppName     string
	APIURL      string
	APIBasePath string
	AuthPath    string
	AppURL      string
	TXURL       string

	AuthCookieName           string
	SessionCookieNameAccess  string
	SessionCookieNameRefresh string
}

func (c *Config) AuthFullPath() string {
	return c.APIBasePath + c.AuthPath
}

func Load() (*Config, error) {
	apiURL, err := MustEnv("API_URL")
	if err != nil {
		return nil, err
	}
	appURL, err := MustEnv("APP_URL")
	if err != nil {
		return nil, err
	}
	txURL, err := MustEnv("TX_URL")
	if err != nil {
		return nil, err
	}

	cfg := &Config{
		Port:        env("PORT", "8080"),
		AppName:     env("APP_NAME", "Konsulin"),
		APIURL:      apiURL,
		APIBasePath: env("API_BASE_PATH", "/api/v1"),
		AuthPath:    env("AUTH_PATH", "/auth"),
		AppURL:      appURL,
		TXURL:       txURL,

		AuthCookieName:           env("AUTH_COOKIE_NAME", "auth"),
		SessionCookieNameAccess:  env("SESSION_COOKIE_NAME_ACCESS", "sAccessToken"),
		SessionCookieNameRefresh: env("SESSION_COOKIE_NAME_REFRESH", "sRefreshToken"),
	}
	slog.Info("config loaded",
		"port", cfg.Port,
		"app_name", cfg.AppName,
		"api_url", cfg.APIURL,
		"api_base_path", cfg.APIBasePath,
		"auth_path", cfg.AuthPath,
		"app_url", cfg.AppURL,
		"auth_cookie_name", cfg.AuthCookieName,
	)
	return cfg, nil
}

func env(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	slog.Debug("env var not set, using default", "key", key, "default", defaultVal)
	return defaultVal
}

func MustEnv(key string) (string, error) {
	val, ok := os.LookupEnv(key)
	if !ok {
		return "", fmt.Errorf("required env var %s is not set", key)
	}
	return val, nil
}
