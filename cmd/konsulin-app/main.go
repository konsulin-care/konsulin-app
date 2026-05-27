package main

import (
	"encoding/json"
	"fmt"
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

type noDirFS struct {
	http.Dir
}

func (d noDirFS) Open(name string) (http.File, error) {
	f, err := d.Dir.Open(name)
	if err != nil {
		return nil, err
	}
	stat, err := f.Stat()
	if err != nil {
		_ = f.Close()
		return nil, err
	}
	if stat.IsDir() {
		_ = f.Close()
		return nil, os.ErrPermission
	}
	return f, nil
}

func routes(cfg *config.Config) (http.Handler, error) {
	r := chi.NewRouter()

	r.Use(chimw.RequestID)
	r.Use(appmw.NewLogger(slog.Default()))
	r.Use(chimw.Recoverer)

	// No global auth guard — all unmatched routes proxy to Next.js which
	// handles its own auth via src/middleware.ts.  The AuthGuard is applied
	// only to Go SSR routes when they are added inside a route group below.

	proxyURL, err := url.Parse(proxyTarget)
	if err != nil {
		return nil, fmt.Errorf("invalid proxy target %q: %w", proxyTarget, err)
	}
	proxy := handler.NewReverseProxy(proxyURL)

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if err := json.NewEncoder(w).Encode(map[string]string{"status": "ok"}); err != nil {
			slog.Error("failed to encode health response", "err", err)
		}
	})

	wd, err := workingDir()
	if err != nil {
		return nil, err
	}
	staticDir := filepath.Join(wd, "web", "static")
	fileServer := http.FileServer(noDirFS{http.Dir(staticDir)})
	r.Handle("/static/*", http.StripPrefix("/static/", fileServer))

	r.Post("/auth/logout", handler.NewLogoutHandler(handler.LogoutOptions{
		AuthPath:       cfg.AuthPath,
		CookieName:     cfg.AuthCookieName,
		BackendBaseURL: cfg.APIURL,
	}))

	// Future Go SSR routes go here — behind AuthGuard.
	// r.Group(func(r chi.Router) {
	// 	r.Use(appmw.AuthGuard(appmw.AuthGuardOptions{
	// 		AuthPath:   cfg.AuthPath,
	// 		CookieName: cfg.AuthCookieName,
	// 	}))
	// 	r.Get("/profile", handler.NewProfileHandler(...))
	// })

	// All unmatched routes proxy to Next.js (which has its own auth guard).
	r.NotFound(proxy.ServeHTTP)

	return r, nil
}

func workingDir() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("failed to get working directory: %w", err)
	}
	return wd, nil
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "err", err)
		os.Exit(1)
	}

	handler, err := routes(cfg)
	if err != nil {
		slog.Error("failed to set up routes", "err", err)
		os.Exit(1)
	}

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      handler,
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
