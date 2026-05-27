package handler

import (
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

func TestReverseProxy_forwardsRequest(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Errorf("expected GET, got %s", r.Method)
		}
		if r.URL.Path != "/some-page" {
			t.Errorf("expected path /some-page, got %s", r.URL.Path)
		}
		if r.Header.Get(xForwardedFor) == "" {
			t.Error("expected X-Forwarded-For header to be set")
		}
		w.Header().Set("Set-Cookie", "session=abc123; Path=/")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("hello from nextjs"))
	}))
	defer upstream.Close()

	upstreamURL, err := url.Parse(upstream.URL)
	if err != nil {
		t.Fatalf("failed to parse upstream URL: %v", err)
	}

	proxy := NewReverseProxy(upstreamURL)
	proxyServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.URL.Path = "/some-page"
		proxy.ServeHTTP(w, r)
	}))
	defer proxyServer.Close()

	resp, err := http.Get(proxyServer.URL + "/some-page")
	if err != nil {
		t.Fatalf("GET via proxy failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read body: %v", err)
	}
	if string(body) != "hello from nextjs" {
		t.Errorf("expected body 'hello from nextjs', got %q", string(body))
	}
}

func TestReverseProxy_forwardsCookies(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie := r.Header.Get("Cookie")
		if !strings.Contains(cookie, "sAccessToken=abc") {
			t.Errorf("expected cookie sAccessToken=abc in request, got %q", cookie)
		}
		if !strings.Contains(cookie, "auth=user123") {
			t.Errorf("expected cookie auth=user123 in request, got %q", cookie)
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	}))
	defer upstream.Close()

	upstreamURL, err := url.Parse(upstream.URL)
	if err != nil {
		t.Fatalf("failed to parse upstream URL: %v", err)
	}

	proxy := NewReverseProxy(upstreamURL)
	proxyServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Header.Set("Cookie", "sAccessToken=abc; auth=user123")
		proxy.ServeHTTP(w, r)
	}))
	defer proxyServer.Close()

	req, err := http.NewRequest(http.MethodGet, proxyServer.URL+"/test", http.NoBody)
	if err != nil {
		t.Fatalf("failed to create request: %v", err)
	}
	req.Header.Set("Cookie", "sAccessToken=abc; auth=user123")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("GET via proxy failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}
}

func TestReverseProxy_hasTransportTimeout(t *testing.T) {
	upstreamURL, err := url.Parse("http://127.0.0.1:9999")
	if err != nil {
		t.Fatalf("failed to parse upstream URL: %v", err)
	}

	proxy := NewReverseProxy(upstreamURL)

	if proxy.Transport == nil {
		t.Fatal("expected Transport to be set")
	}

	tr, ok := proxy.Transport.(*http.Transport)
	if !ok {
		t.Fatalf("expected *http.Transport, got %T", proxy.Transport)
	}
	if tr.TLSHandshakeTimeout <= 0 {
		t.Errorf("expected TLSHandshakeTimeout > 0, got %v", tr.TLSHandshakeTimeout)
	}
	if tr.IdleConnTimeout <= 0 {
		t.Errorf("expected IdleConnTimeout > 0, got %v", tr.IdleConnTimeout)
	}
}

func TestReverseProxy_errorHandler(t *testing.T) {
	badURL, _ := url.Parse("http://127.0.0.1:1")

	proxy := NewReverseProxy(badURL)
	proxyServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		proxy.ServeHTTP(w, r)
	}))
	defer proxyServer.Close()

	resp, err := http.Get(proxyServer.URL + "/fail")
	if err != nil {
		t.Fatalf("GET via proxy failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadGateway {
		t.Errorf("expected status 502, got %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read body: %v", err)
	}
	if !strings.Contains(string(body), "upstream unavailable") {
		t.Errorf("expected body to contain 'upstream unavailable', got %q", string(body))
	}
}
