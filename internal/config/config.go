// Package config loads and holds runtime configuration from environment variables.
package config

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"strings"

	"github.com/a-h/templ"
)

type Config struct {
	Port        string `json:"port"`
	AppName     string `json:"app_name"`
	APIURL      string `json:"api_url"`
	APIBasePath string `json:"api_base_path"`
	AuthPath    string `json:"auth_path"`
	AppURL      string `json:"app_url"`
	TXURL       string `json:"tx_url"`

	AuthCookieName             string `json:"auth_cookie_name"`
	SessionCookieNameAccess    string `json:"session_cookie_name_access"`
	SessionCookieNameRefresh   string `json:"session_cookie_name_refresh"`
	SessionCookieNameIDRefresh string `json:"session_cookie_name_id_refresh"`
	SessionCookieSecret        string `json:"session_cookie_secret"`

	GuestSessionCookieName   string `json:"guest_session_cookie_name"`
	RedirectIntentCookieName string `json:"redirect_intent_cookie_name"`

	NextjsURL                  string `json:"nextjs_url"`
	CookieSecure               bool   `json:"cookie_secure"`
	AllowInsecureBackendLogout bool   `json:"allow_insecure_backend_logout"`
	AllowUnsignedCookies       bool   `json:"allow_unsigned_cookies"`
	CSRFAuthKey                string `json:"csrf_auth_key"`
	LogLevel                   string `json:"log_level"`
}

func (c *Config) AuthFullPath() string {
	return c.APIBasePath + c.AuthPath
}

func (c *Config) AppInfoJSON() string {
	data := map[string]any{
		"appInfo": map[string]any{
			"appName":         c.AppName,
			"apiDomain":       c.APIURL,
			"websiteDomain":   c.AppURL,
			"apiBasePath":     c.AuthFullPath(),
			"websiteBasePath": c.AuthPath,
		},
		"terminologyServer": c.TXURL,
	}
	b, _ := json.Marshal(data)
	return string(b)
}

func (c *Config) RuntimeConfigScript() templ.Component {
	return templ.JSONScript("__RUNTIME_CONFIG__", map[string]any{
		"appInfo": map[string]any{
			"appName":         c.AppName,
			"apiDomain":       c.APIURL,
			"websiteDomain":   c.AppURL,
			"apiBasePath":     c.AuthFullPath(),
			"websiteBasePath": c.AuthPath,
		},
		"terminologyServer": c.TXURL,
	})
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
	sessionSecret, err := MustEnv("SESSION_COOKIE_SECRET")
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

		AuthCookieName:             env("AUTH_COOKIE_NAME", "auth"),
		SessionCookieNameAccess:    env("SESSION_COOKIE_NAME_ACCESS", "sAccessToken"),
		SessionCookieNameRefresh:   env("SESSION_COOKIE_NAME_REFRESH", "sRefreshToken"),
		SessionCookieNameIDRefresh: env("SESSION_COOKIE_NAME_ID_REFRESH", "sIdRefreshToken"),
		SessionCookieSecret:        sessionSecret,

		GuestSessionCookieName:   env("GUEST_SESSION_COOKIE_NAME", "guest_session"),
		RedirectIntentCookieName: env("REDIRECT_INTENT_COOKIE_NAME", "redirect_intent"),

		NextjsURL:                  env("NEXTJS_URL", "http://localhost:8080"),
		CookieSecure:               strings.HasPrefix(appURL, "https://"),
		AllowInsecureBackendLogout: env("ALLOW_INSECURE_BACKEND_LOGOUT", "") != "",
		AllowUnsignedCookies:       env("ALLOW_UNSIGNED_COOKIES", "") != "",
		CSRFAuthKey:                env("CSRF_AUTH_KEY", ""),
		LogLevel:                   env("LOG", "info"),
	}
	slog.Info("config loaded",
		"port", cfg.Port,
		"app_name", cfg.AppName,
		"api_url", cfg.APIURL,
		"api_base_path", cfg.APIBasePath,
		"auth_path", cfg.AuthPath,
		"app_url", cfg.AppURL,
		"auth_cookie_name", cfg.AuthCookieName,
		"guest_session_cookie_name", cfg.GuestSessionCookieName,
		"redirect_intent_cookie_name", cfg.RedirectIntentCookieName,
		"cookie_secure", cfg.CookieSecure,
		"session_cookie_secret_set", cfg.SessionCookieSecret != "",
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
	val = strings.TrimSpace(val)
	if !ok || val == "" {
		return "", fmt.Errorf("required env var %s is not set", key)
	}
	return val, nil
}
