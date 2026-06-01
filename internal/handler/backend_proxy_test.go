package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func testBackendServer() *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/api/v1/echo" && r.Method == http.MethodPost:
			auth := r.Header.Get("Authorization")
			var body map[string]any
			json.NewDecoder(r.Body).Decode(&body)
			json.NewEncoder(w).Encode(map[string]any{
				"auth":  auth,
				"body":  body,
				"path":  r.URL.Path,
				"query": r.URL.RawQuery,
			})

		case r.URL.Path == "/api/v1/status":
			w.Header().Set("Set-Cookie", "session=ok; Path=/")
			w.Header().Set("X-Custom", "val")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"status":"ok"}`))

		default:
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte(`{"error":"not found"}`))
		}
	}))
}

func newProxyServer(t *testing.T) string {
	t.Helper()
	backend := testBackendServer()
	t.Cleanup(backend.Close)
	proxy := NewBackendProxyHandler(BackendProxyOptions{BackendBaseURL: backend.URL})
	srv := httptest.NewServer(proxy)
	t.Cleanup(srv.Close)
	return srv.URL
}

func TestBackendProxy_forwardsRequest(t *testing.T) {
	proxyURL := newProxyServer(t)

	body := `{"test":"data"}`
	req, err := http.NewRequest(http.MethodPost, proxyURL+"/proxy/api/v1/echo?key=val", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	var result map[string]any
	json.NewDecoder(resp.Body).Decode(&result)
	if result["path"] != "/api/v1/echo" {
		t.Errorf("expected path /api/v1/echo, got %v", result["path"])
	}
	if result["query"] != "key=val" {
		t.Errorf("expected query key=val, got %v", result["query"])
	}
}

func TestBackendProxy_headerBehavior(t *testing.T) {
	tests := []struct {
		name       string
		authHeader string
		cookie     string
		wantAuth   string
	}{
		{
			name:       "forwards Authorization header",
			authHeader: "Bearer test-token-xyz",
			wantAuth:   "Bearer test-token-xyz",
		},
		{
			name:     "forwards missing Authorization as empty",
			wantAuth: "",
		},
		{
			name:     "injects Bearer from Cookie",
			cookie:   "sAccessToken=injected-token-abc",
			wantAuth: "Bearer injected-token-abc",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			testBackendProxyHeaderCase(t, tt.authHeader, tt.cookie, tt.wantAuth)
		})
	}
}

func testBackendProxyHeaderCase(t *testing.T, authHeader, cookie, wantAuth string) {
	t.Helper()
	proxyURL := newProxyServer(t)

	req, err := http.NewRequest(http.MethodPost, proxyURL+"/proxy/api/v1/echo", http.NoBody)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	if cookie != "" {
		req.Header.Set("Cookie", cookie)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	var result map[string]any
	json.NewDecoder(resp.Body).Decode(&result)
	if result["auth"] != wantAuth {
		t.Errorf("expected auth %q, got %v", wantAuth, result["auth"])
	}
}

func TestBackendProxy_copiesResponseHeaders(t *testing.T) {
	proxyURL := newProxyServer(t)

	req, err := http.NewRequest(http.MethodGet, proxyURL+"/proxy/api/v1/status", http.NoBody)
	if err != nil {
		t.Fatal(err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
	if resp.Header.Get("X-Custom") != "val" {
		t.Errorf("expected X-Custom: val, got %q", resp.Header.Get("X-Custom"))
	}

	cookies := resp.Cookies()
	found := false
	for _, c := range cookies {
		if c.Name == "session" {
			found = true
			if c.Value != "ok" {
				t.Errorf("expected session=ok cookie, got %q", c.Value)
			}
			break
		}
	}
	if !found {
		t.Error("expected Set-Cookie: session=ok in response")
	}
}

func TestBackendProxy_invalidBackend(t *testing.T) {
	proxy := NewBackendProxyHandler(BackendProxyOptions{BackendBaseURL: "http://127.0.0.1:1"})
	srv := httptest.NewServer(proxy)
	t.Cleanup(srv.Close)

	req, err := http.NewRequest(http.MethodGet, srv.URL+"/proxy/test", http.NoBody)
	if err != nil {
		t.Fatal(err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadGateway {
		t.Errorf("expected 502, got %d", resp.StatusCode)
	}
}
