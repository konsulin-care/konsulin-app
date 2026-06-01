package middleware

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/csrf"
)

const testCSRFKey = "01234567890123456789012345678901" // 32 bytes

func testCSRFRouter() *chi.Mux {
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			next.ServeHTTP(w, r.WithContext(
				context.WithValue(r.Context(), csrf.PlaintextHTTPContextKey, true),
			))
		})
	})
	r.Use(NewCSRFProtection(CSRFConfig{
		AuthKey: []byte(testCSRFKey),
		Secure:  false,
		ExemptPrefixes: []string{
			"/exempt",
			"/health",
		},
	}))
	r.Get("/form", func(w http.ResponseWriter, r *http.Request) {
		token := CSRFToken(r)
		w.Header().Set("X-CSRF-Token", token)
		w.WriteHeader(http.StatusOK)
	})
	r.Post("/submit", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	r.Post("/exempt", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	return r
}

func TestCSRF_POST_withoutToken_returns403(t *testing.T) {
	server := newTestServer(t, testCSRFRouter())
	resp, err := http.Post(server.URL+"/submit", "text/plain", http.NoBody)
	if err != nil {
		t.Fatalf("POST failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected 403, got %d", resp.StatusCode)
	}
}

func TestCSRF_POST_withValidToken_returns200(t *testing.T) {
	server := newTestServer(t, testCSRFRouter())

	getResp, err := http.Get(server.URL + "/form")
	if err != nil {
		t.Fatalf("GET failed: %v", err)
	}
	defer getResp.Body.Close()

	token := getResp.Header.Get("X-CSRF-Token")
	if token == "" {
		t.Fatal("expected CSRF token in response header")
	}

	req, err := http.NewRequest(http.MethodPost, server.URL+"/submit", http.NoBody)
	if err != nil {
		t.Fatalf("failed to create POST request: %v", err)
	}
	req.Header.Set("X-CSRF-Token", token)
	for _, c := range getResp.Cookies() {
		req.AddCookie(c)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("POST failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Errorf("expected 200, got %d: %s", resp.StatusCode, string(body))
	}
}

func TestCSRF_nonMutating_passesThrough(t *testing.T) {
	server := newTestServer(t, testCSRFRouter())
	tests := []struct {
		name   string
		method string
		path   string
	}{
		{"GET to protected path", http.MethodGet, "/form"},
		{"POST to exempt path", http.MethodPost, "/exempt"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := http.NewRequest(tt.method, server.URL+tt.path, http.NoBody)
			if err != nil {
				t.Fatalf("request failed: %v", err)
			}
			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Fatalf("request failed: %v", err)
			}
			defer resp.Body.Close()
			if resp.StatusCode != http.StatusOK {
				t.Errorf("expected 200, got %d", resp.StatusCode)
			}
		})
	}
}

func newTestServer(t *testing.T, handler http.Handler) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)
	return srv
}
