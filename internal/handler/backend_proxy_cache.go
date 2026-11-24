package handler

import (
	"io"
	"log/slog"
	"net/http"

	"github.com/konsulin-care/konsulin-app/internal/proxycache"
)

// serveCacheableGet serves a cacheable public catalog GET through the shared
// cache. On a miss it loads the upstream response; only 200 responses are
// stored. A cached entry is written without any upstream Set-Cookie or token
// headers.
func serveCacheableGet(
	w http.ResponseWriter,
	r *http.Request,
	targetURL string,
	backendPath string,
	resourceType string,
	opts BackendProxyOptions,
) {
	key := proxycache.CacheKey(backendPath, r.URL.RawQuery)

	entry, hit, err := opts.Cache.Do(key, func() (proxycache.Entry, string, bool, error) {
		return loadCacheEntry(r, targetURL, resourceType, opts)
	})
	if err != nil {
		slog.Warn("backend proxy: cached load failed", "target", targetURL, "err", err)
		http.Error(w, "backend unreachable", http.StatusBadGateway)
		return
	}

	writeCacheEntry(w, entry, hit)
}

// loadCacheEntry performs the upstream request for a cacheable GET and reports
// whether the response may be stored.
func loadCacheEntry(
	r *http.Request,
	targetURL string,
	resourceType string,
	opts BackendProxyOptions,
) (proxycache.Entry, string, bool, error) {
	proxyReq, err := newUpstreamRequest(r, targetURL, opts)
	if err != nil {
		return proxycache.Entry{}, "", false, err
	}

	resp, err := doUpstreamRequest(proxyReq)
	if err != nil {
		return proxycache.Entry{}, "", false, err
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return proxycache.Entry{}, "", false, err
	}

	entry := proxycache.Entry{
		Status:      resp.StatusCode,
		ContentType: resp.Header.Get("Content-Type"),
		Body:        body,
	}
	cacheable := resp.StatusCode == http.StatusOK
	return entry, resourceType, cacheable, nil
}

// writeCacheEntry writes an entry from the shared cache. It deliberately never
// emits Set-Cookie or upstream token headers.
func writeCacheEntry(w http.ResponseWriter, entry proxycache.Entry, hit bool) {
	if entry.ContentType != "" {
		w.Header().Set("Content-Type", entry.ContentType)
	}
	w.Header().Set("Cache-Control", "no-store, private")
	if hit {
		w.Header().Set("X-Cache", "HIT")
	} else {
		w.Header().Set("X-Cache", "MISS")
	}
	w.WriteHeader(entry.Status)
	_, _ = w.Write(entry.Body)
}
