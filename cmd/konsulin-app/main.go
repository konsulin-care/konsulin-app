package main

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/konsulin-care/konsulin-app/internal/config"
	"github.com/konsulin-care/konsulin-app/internal/handler"
	appmw "github.com/konsulin-care/konsulin-app/internal/middleware"
)

// proxyTarget is the upstream Next.js dev server.
// Hardcoded during migration — removed entirely post-migration.
var proxyTarget = "http://localhost:8080"

func routes(cfg *config.Config) http.Handler {
	r := chi.NewRouter()

	r.Use(chimw.RequestID)
	r.Use(appmw.NewLogger(slog.Default()))
	r.Use(chimw.Recoverer)

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if err := json.NewEncoder(w).Encode(map[string]string{"status": "ok"}); err != nil {
			slog.Error("failed to encode health response", "err", err)
		}
	})

	staticDir := filepath.Join(workingDir(), "web", "static")
	fileServer := http.FileServer(http.Dir(staticDir))
	r.Handle("/static/*", http.StripPrefix("/static/", fileServer))

	proxyURL, err := url.Parse(proxyTarget)
	if err != nil {
		slog.Error("invalid proxy target", "url", proxyTarget, "err", err)
		os.Exit(1)
	}
	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		handler.NewReverseProxy(proxyURL).ServeHTTP(w, r)
	})

	return r
}

func workingDir() string {
	wd, err := os.Getwd()
	if err != nil {
		slog.Error("failed to get working directory", "err", err)
		os.Exit(1)
	}
	return wd
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "err", err)
		os.Exit(1)
	}

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      routes(cfg),
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
