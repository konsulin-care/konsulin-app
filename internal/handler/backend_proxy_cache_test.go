package handler

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/konsulin-care/konsulin-app/internal/proxycache"
)

// cacheTestUpstream counts requests per path and can force a status per path.
type cacheTestUpstream struct {
	server   *httptest.Server
	requests map[string]*int64
}

func newCacheTestUpstream(t *testing.T) *cacheTestUpstream {
	t.Helper()
	upstream := &cacheTestUpstream{requests: make(map[string]*int64)}
	upstream.server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		counter, ok := upstream.requests[r.URL.Path]
		if !ok {
			counter = new(int64)
			upstream.requests[r.URL.Path] = counter
		}
		atomic.AddInt64(counter, 1)

		if strings.HasPrefix(r.URL.Path, "/fhir/Questionnaire/") && r.Method == http.MethodPut {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"resourceType":"Questionnaire"}`))
			return
		}

		w.Header().Set("Content-Type", "application/fhir+json")
		w.Header().Set("Set-Cookie", "upstream=leak; Path=/")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"resourceType":"Questionnaire","id":"q1"}`))
	}))
	t.Cleanup(upstream.server.Close)
	return upstream
}

// count returns how many requests hit path.
func (u *cacheTestUpstream) count(path string) int64 {
	counter, ok := u.requests[path]
	if !ok {
		return 0
	}
	return atomic.LoadInt64(counter)
}

// newCachedProxyServer starts the proxy with the shared cache enabled.
func newCachedProxyServer(t *testing.T, upstream *cacheTestUpstream) string {
	t.Helper()
	proxy := NewBackendProxyHandler(BackendProxyOptions{
		BackendBaseURL: upstream.server.URL,
		Cache: proxycache.New(proxycache.Options{
			MaxEntries:    100,
			MaxEntryBytes: 1 << 20,
			MaxTotalBytes: 1 << 20,
		}),
	})
	srv := httptest.NewServer(proxy)
	t.Cleanup(srv.Close)
	return srv.URL
}

// doGet performs a GET with an identifying Authorization header.
func doGet(t *testing.T, proxyURL, path, authorization string) (*http.Response, string) {
	t.Helper()
	req, err := http.NewRequest(http.MethodGet, proxyURL+path, http.NoBody)
	if err != nil {
		t.Fatal(err)
	}
	if authorization != "" {
		req.Header.Set("Authorization", authorization)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatal(err)
	}
	return resp, string(body)
}

func TestBackendProxyCache_sharedAcrossUsers(t *testing.T) {
	upstream := newCacheTestUpstream(t)
	proxyURL := newCachedProxyServer(t, upstream)

	firstResp, firstBody := doGet(t, proxyURL, "/proxy/fhir/Questionnaire?_count=10", "Bearer user-a")
	secondResp, secondBody := doGet(t, proxyURL, "/proxy/fhir/Questionnaire?_count=10", "Bearer user-b")

	if got := upstream.count("/fhir/Questionnaire"); got != 1 {
		t.Fatalf("expected 1 upstream request, got %d", got)
	}
	if firstResp.Header.Get("X-Cache") != "MISS" {
		t.Errorf("expected first X-Cache MISS, got %q", firstResp.Header.Get("X-Cache"))
	}
	if secondResp.Header.Get("X-Cache") != "HIT" {
		t.Errorf("expected second X-Cache HIT, got %q", secondResp.Header.Get("X-Cache"))
	}
	if firstBody != secondBody {
		t.Errorf("expected identical bodies, got %q and %q", firstBody, secondBody)
	}
	if cookies := secondResp.Cookies(); len(cookies) != 0 {
		t.Errorf("expected no Set-Cookie on cached response, got %v", cookies)
	}
}

func TestBackendProxyCache_forwardsNonCacheable(t *testing.T) {
	upstream := newCacheTestUpstream(t)
	proxyURL := newCachedProxyServer(t, upstream)

	doGet(t, proxyURL, "/proxy/fhir/Slot", "Bearer user-a")
	doGet(t, proxyURL, "/proxy/fhir/Slot", "Bearer user-b")

	if got := upstream.count("/fhir/Slot"); got != 2 {
		t.Fatalf("expected non-cacheable path to reach upstream twice, got %d", got)
	}
}

func TestBackendProxyCache_non200NotStored(t *testing.T) {
	var calls int64
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt64(&calls, 1)
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"boom"}`))
	}))
	t.Cleanup(upstream.Close)

	proxy := NewBackendProxyHandler(BackendProxyOptions{
		BackendBaseURL: upstream.URL,
		Cache:          proxycache.New(proxycache.Options{MaxEntries: 100}),
	})
	srv := httptest.NewServer(proxy)
	t.Cleanup(srv.Close)

	for i := 0; i < 2; i++ {
		resp, _ := doGet(t, srv.URL, "/proxy/fhir/Questionnaire", "Bearer user-a")
		if resp.StatusCode != http.StatusInternalServerError {
			t.Errorf("expected 500, got %d", resp.StatusCode)
		}
	}

	if got := atomic.LoadInt64(&calls); got != 2 {
		t.Fatalf("expected non-200 to reach upstream twice, got %d", got)
	}
}

func TestBackendProxyCache_putInvalidatesType(t *testing.T) {
	upstream := newCacheTestUpstream(t)
	proxyURL := newCachedProxyServer(t, upstream)

	doGet(t, proxyURL, "/proxy/fhir/Questionnaire", "Bearer user-a")

	req, err := http.NewRequest(http.MethodPut, proxyURL+"/proxy/fhir/Questionnaire/q1", strings.NewReader(`{"resourceType":"Questionnaire"}`))
	if err != nil {
		t.Fatal(err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected PUT 200, got %d", resp.StatusCode)
	}

	doGet(t, proxyURL, "/proxy/fhir/Questionnaire", "Bearer user-a")

	if got := upstream.count("/fhir/Questionnaire"); got != 2 {
		t.Fatalf("expected GET after PUT to reach upstream, total GETs %d", got)
	}
}
