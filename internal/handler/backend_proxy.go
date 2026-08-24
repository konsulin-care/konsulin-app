package handler

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"path"
	"strings"
	"time"
)

// HeaderCookieMapping maps a response header to a Set-Cookie.
type HeaderCookieMapping struct {
	HeaderName string
	CookieName string
	HTTPOnly   bool
}

type BackendProxyOptions struct {
	BackendBaseURL   string
	AccessCookieName string
	CookieMappings   []HeaderCookieMapping
	CookieSecure     bool
}

var backendProxyClient = &http.Client{Timeout: 30 * time.Second}

func NewBackendProxyHandler(opts BackendProxyOptions) http.HandlerFunc {
	baseURL := strings.TrimRight(opts.BackendBaseURL, "/")

	return func(w http.ResponseWriter, r *http.Request) {
		targetURL := buildTargetURL(baseURL, r)

		// nolint:gosec // G704: intentional proxy — forwards to trusted backend
		proxyReq, err := http.NewRequest(r.Method, targetURL, r.Body)
		if err != nil {
			slog.Error("backend proxy: failed to create request", "err", err)
			http.Error(w, "proxy error", http.StatusInternalServerError)
			return
		}

		setProxyRequestHeaders(proxyReq, r)
		setAuthorizationFromRequest(proxyReq, r, targetURL, opts.AccessCookieName)
		proxyReq = proxyReq.WithContext(r.Context())

		// nolint:gosec // G704: intentional proxy — forwards to trusted backend
		resp, err := backendProxyClient.Do(proxyReq)
		if err != nil {
			slog.Warn("backend proxy: upstream unreachable", "target", targetURL, "err", err)
			http.Error(w, "backend unreachable", http.StatusBadGateway)
			return
		}
		defer func() { _ = resp.Body.Close() }()

		writeProxyResponse(w, resp, opts.CookieMappings, opts.CookieSecure)
	}
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

// hopByHopHeaders are headers that must be stripped per RFC 2616 §13.5.1
// when forwarding responses.  Go's HTTP server sets its own Transfer-Encoding
// and Content-Length, so we skip those to avoid conflicts.
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
var strippedHeaders = map[string]bool{
	"St-Access-Token":  true,
	"St-Refresh-Token": true,
}

// nolint:gosec // G101: cookie name, not a credential
const lastAccessTokenUpdateCookie = "st-last-access-token-update"

// jwtExpiry extracts the exp claim from a JWT payload.
// JWT format: header.payload.signature, all base64url-encoded.
func jwtExpiry(token string) (time.Time, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return time.Time{}, errors.New("not a JWT")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return time.Time{}, fmt.Errorf("decode JWT payload: %w", err)
	}
	var claims struct {
		Exp int64 `json:"exp"`
	}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return time.Time{}, fmt.Errorf("parse JWT payload: %w", err)
	}
	if claims.Exp == 0 {
		return time.Time{}, errors.New("JWT has no exp claim")
	}
	return time.Unix(claims.Exp, 0), nil
}

// mappedCookieMaxAge returns the persistence duration for a mapped token
// cookie, derived from the token's JWT exp claim. Session-scoped cookies
// would be dropped on browser restart and defeat the 30-day session
// persistence used elsewhere (see sessionLifetime in auth_cookie.go).
// Falls back to the session lifetime when the claim can't be parsed or
// the token is already expired.
func mappedCookieMaxAge(token string) int {
	const minTTL = time.Minute
	exp, err := jwtExpiry(token)
	if err != nil {
		return int(sessionLifetime.Seconds())
	}
	ttl := time.Until(exp)
	if ttl < minTTL {
		return int(sessionLifetime.Seconds())
	}
	return int(ttl.Seconds())
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
