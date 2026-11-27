package handler

import (
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"path"
	"strings"
	"time"

	"github.com/konsulin-care/konsulin-app/internal/proxycache"
)

// HeaderCookieMapping maps a response header to a Set-Cookie.
type HeaderCookieMapping struct {
	HeaderName string
	CookieName string
	HTTPOnly   bool
}

type BackendProxyOptions struct {
	BackendBaseURL          string
	AccessCookieName        string
	SuperadminKeyCookieName string
	CookieMappings          []HeaderCookieMapping
	CookieSecure            bool

	// Cache is an optional shared response cache for cacheable public catalog
	// GETs. When nil, every request is forwarded to the backend unchanged.
	Cache *proxycache.Cache
}

var backendProxyClient = &http.Client{Timeout: 30 * time.Second}

func NewBackendProxyHandler(opts BackendProxyOptions) http.HandlerFunc {
	baseURL := strings.TrimRight(opts.BackendBaseURL, "/")

	return func(w http.ResponseWriter, r *http.Request) {
		targetURL := buildTargetURL(baseURL, r)
		backendPath := strings.TrimPrefix(r.URL.Path, "/proxy")

		if opts.Cache != nil {
			if resourceType, ok := proxycache.Cacheable(r.Method, backendPath, r.URL.RawQuery); ok {
				serveCacheableGet(w, r, targetURL, backendPath, resourceType, opts)
				return
			}
		}

		readOnlyBatch := false
		if opts.Cache != nil {
			r, readOnlyBatch = detectReadOnlyBatch(r, backendPath)
		}

		status := forwardAndWrite(w, r, targetURL, opts)
		if opts.Cache != nil {
			if resourceType, ok := cacheInvalidationType(r.Method, backendPath, status, readOnlyBatch); ok {
				opts.Cache.InvalidateType(resourceType)
			}
		}
	}
}

// forwardAndWrite proxies r to targetURL and writes the upstream response,
// returning the upstream status code (0 when no response was received).
func forwardAndWrite(w http.ResponseWriter, r *http.Request, targetURL string, opts BackendProxyOptions) int {
	proxyReq, err := newUpstreamRequest(r, targetURL, opts)
	if err != nil {
		slog.Error("backend proxy: failed to create request", "err", err)
		http.Error(w, "proxy error", http.StatusInternalServerError)
		return 0
	}

	resp, err := doUpstreamRequest(proxyReq)
	if err != nil {
		slog.Warn("backend proxy: upstream unreachable", "target", targetURL, "err", err)
		http.Error(w, "backend unreachable", http.StatusBadGateway)
		return 0
	}
	defer func() { _ = resp.Body.Close() }()

	writeProxyResponse(w, resp, opts.CookieMappings, opts.CookieSecure)
	return resp.StatusCode
}

// newUpstreamRequest builds the upstream request, forwarding the same auth and
// identity headers as the non-cached proxy path.
func newUpstreamRequest(r *http.Request, targetURL string, opts BackendProxyOptions) (*http.Request, error) {
	// nolint:gosec // G704: intentional proxy — forwards to trusted backend
	proxyReq, err := http.NewRequest(r.Method, targetURL, r.Body)
	if err != nil {
		return nil, err
	}

	setProxyRequestHeaders(proxyReq, r)
	setAuthorizationFromRequest(proxyReq, r, targetURL, opts.AccessCookieName)
	injectSuperadminKeyFromCookie(proxyReq, r, opts.SuperadminKeyCookieName)
	return proxyReq.WithContext(r.Context()), nil
}

// doUpstreamRequest executes a prepared upstream request.
func doUpstreamRequest(proxyReq *http.Request) (*http.Response, error) {
	// nolint:gosec // G704: intentional proxy — forwards to trusted backend
	return backendProxyClient.Do(proxyReq)
}

// buildTargetURL constructs the upstream URL from the original request.
// path.Clean resolves "." / ".." segments and normalises the path.
// The explicit ".." guard prevents path traversal to unintended backend routes.
func buildTargetURL(baseURL string, r *http.Request) string {
	targetPath := strings.TrimPrefix(r.URL.Path, "/proxy")

	if strings.HasPrefix(targetPath, "..") || strings.Contains(targetPath, "/..") {
		slog.Warn("backend proxy: path traversal rejected", "path", targetPath)
		targetPath = "/"
	}

	cleanPath := path.Clean(targetPath)
	if cleanPath == "." || cleanPath == "" {
		cleanPath = "/"
	}
	targetURL := baseURL + cleanPath
	if r.URL.RawQuery != "" {
		targetURL += "?" + r.URL.RawQuery
	}
	return targetURL
}

func setProxyRequestHeaders(proxyReq, r *http.Request) {
	proxyReq.Header.Set("Content-Type", r.Header.Get("Content-Type"))
	proxyReq.Header.Set("Cookie", r.Header.Get("Cookie"))
	slog.Debug("backend proxy: forwarded cookies",
		"cookies", cookieNames(r.Header.Get("Cookie")))
	if rid := r.Header.Get("rid"); rid != "" {
		proxyReq.Header.Set("rid", rid)
	}
	// SuperTokens SDK security headers. The anti-csrf header is required by
	// Core during session refresh when anti-CSRF is enabled; dropping it makes
	// every refresh 401 and kills the session on the next reload.
	if v := r.Header.Get("anti-csrf"); v != "" {
		proxyReq.Header.Set("anti-csrf", v)
	}
	if v := r.Header.Get("st-auth-mode"); v != "" {
		proxyReq.Header.Set("st-auth-mode", v)
	}
	if v := r.Header.Get("fdi-version"); v != "" {
		proxyReq.Header.Set("fdi-version", v)
	}
	setClientIPHeaders(proxyReq, r)
}

func setAuthorizationFromRequest(proxyReq, r *http.Request, targetURL, accessCookieName string) {
	// Always forward an explicit Authorization header supplied by the client
	// (e.g. a Bearer refresh token on /session/refresh from the SDK).
	if auth := r.Header.Get("Authorization"); auth != "" {
		proxyReq.Header.Set("Authorization", auth)
		return
	}

	// SuperTokens auth endpoints (session/refresh etc.) use cookie-based auth;
	// injecting a Bearer header with the access token interferes with the refresh flow.
	if strings.Contains(targetURL, "/api/v1/auth/") {
		return
	}

	cookieName := accessCookieName
	if cookieName == "" {
		cookieName = "sAccessToken"
	}
	accessCookie, err := r.Cookie(cookieName)
	if err != nil || accessCookie.Value == "" {
		return
	}

	token := accessCookie.Value
	proxyReq.Header.Set("Authorization", "Bearer "+token)
	truncated := token
	if len(truncated) > 10 {
		truncated = truncated[:10]
	}
	slog.Debug("backend proxy: injected access token",
		"prefix", truncated, "target", targetURL)
}

// injectSuperadminKeyFromCookie forwards the BFF-held superadmin API key as
// the X-API-Key header when the superadmin key cookie is present. The key is
// stored in an HttpOnly cookie (see admin_key.go) so only the BFF can read it;
// the backend validates the value (lazy enforcement).
func injectSuperadminKeyFromCookie(proxyReq, r *http.Request, cookieName string) {
	if cookieName == "" {
		return
	}
	c, err := r.Cookie(cookieName)
	if err != nil || c.Value == "" {
		return
	}
	proxyReq.Header.Set("X-API-Key", c.Value)
}

// hopByHopHeaders are headers that must be stripped per RFC 2616 §13.5.1
// when forwarding responses.  Go's HTTP server sets its own Transfer-Encoding
// and Content-Length, so we skip those to avoid conflicts.
var hopByHopHeaders = map[string]bool{
	"Connection":          true,
	"Keep-Alive":          true,
	"Transfer-Encoding":   true,
	"TE":                  true,
	"Trailers":            true,
	"Upgrade":             true,
	"Proxy-Authenticate":  true,
	"Proxy-Authorization": true,
	"Content-Length":      true,
}

// strippedHeaders are backend response headers that must not be forwarded to the
// browser. These token headers are converted to HttpOnly Set-Cookie equivalents
// via CookieMappings instead. The front-token header is intentionally NOT
// stripped because the SuperTokens SDK reads it from refresh responses to
// update its internal session state.
//
// ETag and Last-Modified are stripped because browsers apply heuristic caching
// when they see these headers, even with Cache-Control: no-store. This causes
// stale FHIR resources to be served from disk cache on subsequent loads.
var strippedHeaders = map[string]bool{
	"St-Access-Token":  true,
	"St-Refresh-Token": true,
	"Etag":             true,
	"Last-Modified":    true,
}

func writeProxyResponse(w http.ResponseWriter, resp *http.Response, cookieMappings []HeaderCookieMapping, cookieSecure bool) {
	for k, vs := range resp.Header {
		if hopByHopHeaders[http.CanonicalHeaderKey(k)] {
			continue
		}
		if strippedHeaders[http.CanonicalHeaderKey(k)] {
			continue
		}
		for _, v := range vs {
			w.Header().Add(k, v)
		}
	}

	// Convert mapped response headers to Set-Cookie headers.
	hasMapping := false
	for _, m := range cookieMappings {
		val := resp.Header.Get(m.HeaderName)
		if val == "" {
			continue
		}
		hasMapping = true
		// nolint:gosec // G124: Secure and HttpOnly are set explicitly
		// nosemgrep — HttpOnly/Secure come from CookieMappings config and runtime env (routes.go)
		cookie := &http.Cookie{
			Name:     m.CookieName,
			Value:    val,
			Path:     "/",
			HttpOnly: m.HTTPOnly,
			Secure:   cookieSecure,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   mappedCookieMaxAge(val),
		}
		w.Header().Add("Set-Cookie", cookie.String())
	}

	// When any CookieMapping produced a value, set the SDK's session existence
	// tracking cookie so that getLocalSessionState() returns "EXISTS". Without
	// this, the SDK treats the session as "MAY_EXIST" and triggers a refresh.
	if hasMapping {
		// nolint:gosec // G124: non-httpOnly so the SDK can read it via JS
		// nosemgrep — must stay JS-readable for the SuperTokens SDK; Secure follows runtime env
		http.SetCookie(w, &http.Cookie{ // NOSONAR
			Name:     lastAccessTokenUpdateCookie,
			Value:    fmt.Sprintf("%d", time.Now().UnixMilli()),
			Path:     "/",
			HttpOnly: false,
			Secure:   cookieSecure,
			SameSite: http.SameSiteLaxMode,
		})
	}

	// Prevent browser from caching API responses. Without this, the browser
	// applies heuristic caching when the upstream sends ETag/Last-Modified
	// without Cache-Control (e.g. HAPI FHIR direct resource reads).
	w.Header().Set("Cache-Control", "no-store, private")

	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}
