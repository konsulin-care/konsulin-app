package handler

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
)

func TestBackendProxy_stripsRawTokenHeaders(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("st-access-token", "jwt-access")
		w.Header().Set("st-refresh-token", "jwt-refresh")
		w.Header().Set("front-token", "front-info")
		w.Header().Set("anti-csrf", "csrf-token")
		w.Header().Set("X-Custom", "should-pass")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{}`))
	}))
	t.Cleanup(backend.Close)

	proxy := NewBackendProxyHandler(BackendProxyOptions{
		BackendBaseURL: backend.URL,
		CookieMappings: []HeaderCookieMapping{
			{HeaderName: "st-access-token", CookieName: "sAccessToken", HTTPOnly: true},
			{HeaderName: "st-refresh-token", CookieName: "sRefreshToken", HTTPOnly: true},
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

	if v := resp.Header.Get("St-Access-Token"); v != "" {
		t.Errorf("st-access-token response header must be stripped, got %q", v)
	}
	if v := resp.Header.Get("St-Refresh-Token"); v != "" {
		t.Errorf("st-refresh-token response header must be stripped, got %q", v)
	}
	if v := resp.Header.Get("Front-Token"); v != "" {
		t.Errorf("front-token response header must be stripped, got %q", v)
	}
	if v := resp.Header.Get("Anti-Csrf"); v != "csrf-token" {
		t.Errorf("anti-csrf header should be forwarded, got %q", v)
	}
	if v := resp.Header.Get("X-Custom"); v != "should-pass" {
		t.Errorf("X-Custom header should pass through, got %q", v)
	}
}

func TestBackendProxy_setsLastAccessTokenUpdate(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("st-access-token", "jwt-access")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{}`))
	}))
	t.Cleanup(backend.Close)

	proxy := NewBackendProxyHandler(BackendProxyOptions{
		BackendBaseURL: backend.URL,
		CookieMappings: []HeaderCookieMapping{
			{HeaderName: "st-access-token", CookieName: "sAccessToken", HTTPOnly: true},
		},
		CookieSecure: false,
	})
	srv := httptest.NewServer(proxy)
	t.Cleanup(srv.Close)

	req, _ := http.NewRequest(http.MethodGet, srv.URL+"/proxy/test", http.NoBody)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	cookies := resp.Cookies()
	var lastUpdate *http.Cookie
	for _, c := range cookies {
		if c.Name == "st-last-access-token-update" {
			lastUpdate = c
			break
		}
	}
	if lastUpdate == nil {
		t.Fatal("expected st-last-access-token-update cookie to be set")
		return
	}
	if lastUpdate.Value == "" {
		t.Error("st-last-access-token-update must have a non-empty value")
	}
	if lastUpdate.HttpOnly {
		t.Error("st-last-access-token-update must NOT be HttpOnly")
	}
	if _, err := strconv.ParseInt(lastUpdate.Value, 10, 64); err != nil {
		t.Errorf("st-last-access-token-update must be a valid UnixMilli timestamp, got %q", lastUpdate.Value)
	}
}

func TestBackendProxy_noLastUpdateWhenNoMappings(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("st-access-token", "jwt-access")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{}`))
	}))
	t.Cleanup(backend.Close)

	proxy := NewBackendProxyHandler(BackendProxyOptions{
		BackendBaseURL: backend.URL,
		CookieMappings: nil,
		CookieSecure:   false,
	})
	srv := httptest.NewServer(proxy)
	t.Cleanup(srv.Close)

	req, _ := http.NewRequest(http.MethodGet, srv.URL+"/proxy/test", http.NoBody)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	for _, c := range resp.Cookies() {
		if c.Name == "st-last-access-token-update" {
			t.Error("st-last-access-token-update must NOT be set when no cookie mappings produce values")
		}
	}
}
