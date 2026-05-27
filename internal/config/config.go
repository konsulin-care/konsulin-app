// Package config provides runtime configuration from environment variables.
// Load() is called once at startup; handlers receive the immutable Config struct via DI.
package config

import (
	"fmt"
	"log/slog"
	"os"
)

type Config struct {
	Port string `env:"PORT"`
}

func Load() (*Config, error) {
	cfg := &Config{
		Port: env("PORT", "8080"),
	}
	slog.Info("config loaded", "port", cfg.Port)
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
