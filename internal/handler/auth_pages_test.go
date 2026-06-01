package handler

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/konsulin-care/konsulin-app/internal/config"
)

func TestAuthPageHandler_servesShell(t *testing.T) {
	cfg := &config.Config{
		AppName: "Konsulin",
	}
	handler := NewAuthPageHandler(cfg)

	tests := []struct {
		name    string
		method  string
		path    string
		want    int
		checkFn func(t *testing.T, body string)
	}{
		{
			name:   "GET /auth returns shell with mount point",
			method: http.MethodGet,
			path:   "/auth",
			want:   http.StatusOK,
			checkFn: func(t *testing.T, body string) {
				if !strings.Contains(body, `<div id="supertokens-root">`) {
					t.Error("expected supertokens-root mount point")
				}
				if !strings.Contains(body, `/static/auth-spa/index.js`) {
					t.Error("expected auth-spa bundle script")
				}
			},
		},
		{
			name:   "GET /auth/verify returns shell",
			method: http.MethodGet,
			path:   "/auth/verify",
			want:   http.StatusOK,
			checkFn: func(t *testing.T, body string) {
				if !strings.Contains(body, `<div id="supertokens-root">`) {
					t.Error("expected supertokens-root mount point")
				}
			},
		},
		{
			name:   "GET /auth/callback/google returns shell",
			method: http.MethodGet,
			path:   "/auth/callback/google",
			want:   http.StatusOK,
			checkFn: func(t *testing.T, body string) {
				if !strings.Contains(body, `<div id="supertokens-root">`) {
					t.Error("expected supertokens-root mount point")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, http.NoBody)
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			if rec.Code != tt.want {
				t.Errorf("expected status %d, got %d", tt.want, rec.Code)
			}

			if tt.checkFn != nil {
				tt.checkFn(t, rec.Body.String())
			}
		})
	}
}

func TestAuthPageHandler_nonGetMethodsNotRejected(t *testing.T) {
	cfg := &config.Config{AppName: "Konsulin"}
	handler := NewAuthPageHandler(cfg)

	methods := []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch}
	for _, method := range methods {
		t.Run(method, func(t *testing.T) {
			req := httptest.NewRequest(method, "/auth", http.NoBody)
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			// Handler serves shell for all methods — Chi router restricts to GET.
			// Verify no panic and HTML is returned.
			if rec.Code != http.StatusOK {
				t.Errorf("expected 200, got %d", rec.Code)
			}
			if !strings.Contains(rec.Body.String(), `<div id="supertokens-root">`) {
				t.Error("expected supertokens-root mount point")
			}
		})
	}
}
