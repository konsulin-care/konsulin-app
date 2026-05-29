package handler

import (
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

type BackendProxyOptions struct {
	BackendBaseURL string
}

var backendProxyClient = &http.Client{Timeout: 30 * time.Second}

func NewBackendProxyHandler(opts BackendProxyOptions) http.HandlerFunc {
	baseURL := strings.TrimRight(opts.BackendBaseURL, "/")

	return func(w http.ResponseWriter, r *http.Request) {
		targetURL := buildTargetURL(baseURL, r)

		//nolint:gosec // G704: intentional proxy — forwards to trusted backend
		proxyReq, err := http.NewRequest(r.Method, targetURL, r.Body)
		if err != nil {
			slog.Error("backend proxy: failed to create request", "err", err)
			http.Error(w, "proxy error", http.StatusInternalServerError)
			return
		}

		setProxyRequestHeaders(proxyReq, r)
		setAuthorizationFromRequest(proxyReq, r, targetURL)
		proxyReq = proxyReq.WithContext(r.Context())

		//nolint:gosec // G704: intentional proxy — forwards to trusted backend
		resp, err := backendProxyClient.Do(proxyReq)
		if err != nil {
			slog.Warn("backend proxy: upstream unreachable", "target", targetURL, "err", err)
			http.Error(w, "backend unreachable", http.StatusBadGateway)
			return
		}
		defer func() { _ = resp.Body.Close() }()

		writeProxyResponse(w, resp)
	}
}

func buildTargetURL(baseURL string, r *http.Request) string {
	targetPath := strings.TrimPrefix(r.URL.Path, "/proxy")
	targetURL := baseURL + targetPath
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
}

func setAuthorizationFromRequest(proxyReq, r *http.Request, targetURL string) {
	if auth := r.Header.Get("Authorization"); auth != "" {
		proxyReq.Header.Set("Authorization", auth)
		return
	}

	accessCookie, err := r.Cookie("sAccessToken")
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

func writeProxyResponse(w http.ResponseWriter, resp *http.Response) {
	for k, vs := range resp.Header {
		if hopByHopHeaders[http.CanonicalHeaderKey(k)] {
			continue
		}
		for _, v := range vs {
			w.Header().Add(k, v)
		}
	}
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}

// cookieNames extracts cookie names from a Cookie header value for debug logging.
func cookieNames(header string) []string {
	if header == "" {
		return nil
	}
	var names []string
	for _, part := range strings.Split(header, ";") {
		part = strings.TrimSpace(part)
		if idx := strings.IndexByte(part, '='); idx > 0 {
			names = append(names, part[:idx])
		}
	}
	return names
}
