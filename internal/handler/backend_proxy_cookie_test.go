package handler

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"
)

func TestBackendProxy_stripsRawTokenHeaders(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
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
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
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

// buildTestJWT returns a structurally valid JWT whose payload carries the given
// exp claim. The signature is a dummy — the proxy only reads the payload.
func buildTestJWT(t *testing.T, exp int64) string {
	t.Helper()
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"none","typ":"JWT"}`))
	payload, err := json.Marshal(map[string]int64{"exp": exp})
	if err != nil {
		t.Fatal(err)
	}
	return header + "." + base64.RawURLEncoding.EncodeToString(payload) + ".dummy-signature"
}

func TestBackendProxy_mappedCookiesPersistUntilTokenExpiry(t *testing.T) {
	now := time.Now()
	accessJWT := buildTestJWT(t, now.Add(time.Hour).Unix())
	refreshJWT := buildTestJWT(t, now.Add(30*24*time.Hour).Unix())
	frontJWT := buildTestJWT(t, now.Add(24*time.Hour).Unix())

	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("st-access-token", accessJWT)
		w.Header().Set("st-refresh-token", refreshJWT)
		w.Header().Set("front-token", frontJWT)
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

	req, _ := http.NewRequest(http.MethodGet, srv.URL+"/proxy/api/v1/auth/consume", http.NoBody)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	cookies := resp.Cookies()
	cookieMap := make(map[string]*http.Cookie)
	for _, c := range cookies {
		cookieMap[c.Name] = c
	}

	assertMaxAge := func(name string, wantMin, wantMax time.Duration) {
		t.Helper()
		c, ok := cookieMap[name]
		if !ok {
			t.Fatalf("expected Set-Cookie: %s", name)
		}
		if c.MaxAge <= 0 {
			t.Errorf("%s must be a persistent cookie (MaxAge > 0), got %d", name, c.MaxAge)
		}
		got := time.Duration(c.MaxAge) * time.Second
		if got < wantMin || got > wantMax {
			t.Errorf("%s MaxAge = %v, want between %v and %v", name, got, wantMin, wantMax)
		}
	}

	// Access token lives ~1h — cookie must expire inside that window.
	assertMaxAge("sAccessToken", 55*time.Minute, 90*time.Minute)
	// Refresh token lives ~30d — cookie must persist for days, not the session.
	assertMaxAge("sRefreshToken", 29*24*time.Hour, 31*24*time.Hour)
	// Front token carries session-level info (~24h in this test).
	assertMaxAge("sFrontToken", 23*time.Hour, 25*time.Hour)

	// Access token cookie must expire long before the refresh token cookie.
	if cookieMap["sAccessToken"].MaxAge >= cookieMap["sRefreshToken"].MaxAge {
		t.Errorf("access token cookie MaxAge (%d) must be smaller than refresh token cookie MaxAge (%d)",
			cookieMap["sAccessToken"].MaxAge, cookieMap["sRefreshToken"].MaxAge)
	}
}

func TestBackendProxy_mappedCookiesFallbackToSessionLifetime(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("st-access-token", "opaque-token-without-exp")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{}`))
	}))
	t.Cleanup(backend.Close)

	proxy := NewBackendProxyHandler(BackendProxyOptions{
		BackendBaseURL: backend.URL,
		CookieMappings: []HeaderCookieMapping{
			{HeaderName: "st-access-token", CookieName: "sAccessToken", HTTPOnly: true},
		},
	})
	srv := httptest.NewServer(proxy)
	t.Cleanup(srv.Close)

	req, _ := http.NewRequest(http.MethodGet, srv.URL+"/proxy/api/v1/auth/consume", http.NoBody)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	for _, c := range resp.Cookies() {
		if c.Name != "sAccessToken" {
			continue
		}
		want := int((30 * 24 * time.Hour).Seconds())
		if c.MaxAge != want {
			t.Errorf("fallback MaxAge = %d, want %d (session lifetime)", c.MaxAge, want)
		}
		return
	}
	t.Fatal("expected Set-Cookie: sAccessToken")
}

func TestBackendProxy_noLastUpdateWhenNoMappings(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
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
