package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestBackendProxy_forwardsSuperTokensHeaders verifies that the SuperTokens
// SDK security headers (anti-csrf, st-auth-mode, fdi-version) and an explicit
// Authorization header are forwarded to the upstream backend on /api/v1/auth/*
// calls, alongside the pre-existing Content-Type, Cookie and rid headers.
func TestBackendProxy_forwardsSuperTokensHeaders(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/auth/session/refresh" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]string{
			"content_type":  r.Header.Get("Content-Type"),
			"cookie":        r.Header.Get("Cookie"),
			"rid":           r.Header.Get("rid"),
			"anti_csrf":     r.Header.Get("anti-csrf"),
			"st_auth_mode":  r.Header.Get("st-auth-mode"),
			"fdi_version":   r.Header.Get("fdi-version"),
			"authorization": r.Header.Get("Authorization"),
		})
	}))
	t.Cleanup(backend.Close)

	proxy := NewBackendProxyHandler(BackendProxyOptions{
		BackendBaseURL: backend.URL,
		CookieMappings: []HeaderCookieMapping{
			{HeaderName: "st-access-token", CookieName: "sAccessToken", HTTPOnly: true},
			{HeaderName: "st-refresh-token", CookieName: "sRefreshToken", HTTPOnly: true},
			{HeaderName: "front-token", CookieName: "sFrontToken", HTTPOnly: false},
		},
	})
	srv := httptest.NewServer(proxy)
	t.Cleanup(srv.Close)

	req, err := http.NewRequest(http.MethodPost, srv.URL+"/api/v1/auth/session/refresh", http.NoBody)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Cookie", "sRefreshToken=refresh-123; sAccessToken=access-123")
	req.Header.Set("rid", "session")
	req.Header.Set("anti-csrf", "anti-csrf-123")
	req.Header.Set("st-auth-mode", "cookie")
	req.Header.Set("fdi-version", "2.28")
	req.Header.Set("Authorization", "Bearer refresh-123")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var got map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}

	want := map[string]string{
		"content_type":  "application/json",
		"cookie":        "sRefreshToken=refresh-123; sAccessToken=access-123",
		"rid":           "session",
		"anti_csrf":     "anti-csrf-123",
		"st_auth_mode":  "cookie",
		"fdi_version":   "2.28",
		"authorization": "Bearer refresh-123",
	}
	for k, v := range want {
		if got[k] != v {
			t.Errorf("expected %s=%q, got %q", k, v, got[k])
		}
	}
}

// TestBackendProxy_frontTokenPassesThrough verifies that the front-token
// response header is NOT stripped by the proxy. The SuperTokens frontend SDK
// reads this header from refresh responses to update its internal session
// state. Stripping it causes "The 'front-token' header is missing" errors.
// The header must pass through alongside the sFrontToken cookie set by
// CookieMappings.
func TestBackendProxy_frontTokenPassesThrough(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("front-token", "front-session-payload")
		w.Header().Set("st-access-token", "jwt-access")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{}`))
	}))
	t.Cleanup(backend.Close)

	proxy := NewBackendProxyHandler(BackendProxyOptions{
		BackendBaseURL: backend.URL,
		CookieMappings: []HeaderCookieMapping{
			{HeaderName: "st-access-token", CookieName: "sAccessToken", HTTPOnly: true},
			{HeaderName: "front-token", CookieName: "sFrontToken", HTTPOnly: false},
		},
		CookieSecure: true,
	})
	srv := httptest.NewServer(proxy)
	t.Cleanup(srv.Close)

	req, _ := http.NewRequest(http.MethodGet, srv.URL+"/proxy/test", http.NoBody)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	// front-token header must pass through to the client.
	if v := resp.Header.Get("Front-Token"); v != "front-session-payload" {
		t.Errorf("front-token header must pass through, got %q", v)
	}

	// st-access-token must still be stripped (converted to cookie only).
	if v := resp.Header.Get("St-Access-Token"); v != "" {
		t.Errorf("st-access-token must still be stripped, got %q", v)
	}

	// sFrontToken cookie must still be set from the front-token header.
	found := false
	for _, c := range resp.Cookies() {
		if c.Name == "sFrontToken" && c.Value == "front-session-payload" {
			found = true
			if c.HttpOnly {
				t.Error("sFrontToken cookie must NOT be HttpOnly")
			}
		}
	}
	if !found {
		t.Error("sFrontToken cookie must be set from front-token header")
	}
}
