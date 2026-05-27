package main

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/konsulin-care/konsulin-app/internal/config"
)

func routes() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if err := json.NewEncoder(w).Encode(map[string]string{"status": "ok"}); err != nil {
			slog.Error("failed to encode health response", "err", err)
		}
	})

	return r
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "err", err)
		os.Exit(1)
	}

	// TLS is terminated at the nginx reverse proxy (deployed via Ansible playbooks).
	// The app itself serves plain HTTP behind the proxy.
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      routes(),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	slog.Info("starting server", "port", cfg.Port)
	if err := srv.ListenAndServe(); err != nil {
		slog.Error("server failed", "err", err)
		os.Exit(1)
	}
}
