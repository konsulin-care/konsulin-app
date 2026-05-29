package middleware

import (
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/konsulin-care/konsulin-app/internal/client"
	"github.com/konsulin-care/konsulin-app/internal/session"
)

// anonCacheEntry holds a cached anonymous session result with expiry.
type anonCacheEntry struct {
	result    *client.AnonymousSessionResult
	expiresAt time.Time
}

// anonSessionCache is a short-lived in-memory cache for anonymous session
// creation, keyed by client IP hash.  This prevents a burst of requests from
// a cookieless client (e.g. crawler, privacy-mode browser) from hammering the
// backend API on every request.  5s TTL.
var (
	anonSessionCache   = make(map[string]anonCacheEntry)
	anonSessionCacheMu sync.RWMutex
)

// cacheTTL is how long a cached anonymous session is considered valid.
const cacheTTL = 5 * time.Second

// ResetAnonSessionCache clears the cache. Exported for tests.
func ResetAnonSessionCache() {
	anonSessionCacheMu.Lock()
	anonSessionCache = make(map[string]anonCacheEntry)
	anonSessionCacheMu.Unlock()
}

// clientIP extracts the real client IP from headers or the remote address.
func clientIP(r *http.Request) string {
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		if idx := strings.IndexByte(fwd, ','); idx > 0 {
			return strings.TrimSpace(fwd[:idx])
		}
		return strings.TrimSpace(fwd)
	}
	if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
		return realIP
	}
	addr := r.RemoteAddr
	if idx := strings.LastIndexByte(addr, ':'); idx > 0 {
		return addr[:idx]
	}
	return addr
}

// ipHash returns a SHA-256 hex digest of the client IP for cache keying
// without storing raw IPs.
func ipHash(ip string) string {
	h := sha256.Sum256([]byte(ip))
	return fmt.Sprintf("%x", h[:8]) // 16 hex chars is enough for cache key
}

// lookupCachedSession checks the in-memory cache for a previously created
// anonymous session from the same client IP.
func lookupCachedSession(r *http.Request) *client.AnonymousSessionResult {
	key := ipHash(clientIP(r))
	anonSessionCacheMu.RLock()
	entry, ok := anonSessionCache[key]
	anonSessionCacheMu.RUnlock()
	if !ok || time.Now().After(entry.expiresAt) {
		if ok {
			anonSessionCacheMu.Lock()
			delete(anonSessionCache, key)
			anonSessionCacheMu.Unlock()
		}
		return nil
	}
	return entry.result
}

// storeCachedSession stores the anonymous session result in the cache keyed
// by client IP hash with a 5-second TTL.
func storeCachedSession(r *http.Request, result *client.AnonymousSessionResult) {
	key := ipHash(clientIP(r))
	anonSessionCacheMu.Lock()
	anonSessionCache[key] = anonCacheEntry{
		result:    result,
		expiresAt: time.Now().Add(cacheTTL),
	}
	anonSessionCacheMu.Unlock()
}

type OptionalAuthOptions struct {
	AuthCookieName         string
	GuestSessionCookieName string
	CookieSecret           string
	BackendAPIURL          string
	CookieSecure           bool
}

const guestSessionMaxAge = 86400 // 24 hours

// OptionalAuth is a soft auth middleware that injects a session into the request
// context without ever redirecting. Priority: real auth cookie > guest cookie > new API call.
func OptionalAuth(opts OptionalAuthOptions) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Tier 1: Real auth cookie (authenticated user)
			sess, err := session.ExtractFromRequest(r, opts.AuthCookieName, opts.CookieSecret)
			if err == nil {
				ctx := session.ContextWithSession(r.Context(), sess)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// Tier 2: Guest session cookie
			sess, err = extractGuestSession(r, opts.GuestSessionCookieName)
			if err == nil {
				ctx := session.ContextWithSession(r.Context(), sess)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// Tier 3: Create new anonymous session via backend API
			// Short-lived in-memory cache per IP reduces backend pressure from
			// cookieless clients (crawlers, privacy-mode, cookie-clearing users).
			result := lookupCachedSession(r)
			if result == nil {
				var fetchErr error
				result, fetchErr = client.FetchAnonymousSession(opts.BackendAPIURL)
				if fetchErr != nil {
					slog.Warn("optional auth: failed to create anonymous session, proceeding without GuestID",
						"path", r.URL.Path, "err", fetchErr)
					sess = &session.Session{Role: "Guest"}
					ctx := session.ContextWithSession(r.Context(), sess)
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
				storeCachedSession(r, result)
			}

			setGuestSessionCookie(w, opts, result.GuestID, result.Token)
			sess = &session.Session{GuestID: result.GuestID, Role: "Guest", Token: result.Token}
			ctx := session.ContextWithSession(r.Context(), sess)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

type guestCookieData struct {
	GuestID string `json:"guestId"`
	Token   string `json:"token,omitempty"`
}

func extractGuestSession(r *http.Request, cookieName string) (*session.Session, error) {
	c, err := r.Cookie(cookieName)
	if err != nil {
		return nil, err
	}
	if c.Value == "" {
		return nil, errors.New("guest session cookie is empty")
	}
	decoded, err := url.QueryUnescape(c.Value)
	if err != nil {
		decoded = c.Value
	}
	var data guestCookieData
	if err := json.Unmarshal([]byte(decoded), &data); err != nil {
		return nil, err
	}
	if data.GuestID == "" {
		return nil, errors.New("guest session cookie missing guestId")
	}
	return &session.Session{GuestID: data.GuestID, Role: "Guest", Token: data.Token}, nil
}

func setGuestSessionCookie(w http.ResponseWriter, opts OptionalAuthOptions, guestID, token string) {
	data := guestCookieData{
		GuestID: guestID,
		Token:   token,
	}
	raw, _ := json.Marshal(data)
	val := url.QueryEscape(string(raw))
	//nolint:gosec // G124: HttpOnly=false required for JS to read guest_session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     opts.GuestSessionCookieName,
		Value:    val,
		Path:     "/",
		MaxAge:   guestSessionMaxAge,
		HttpOnly: false,
		Secure:   opts.CookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
}

// GuestSessionTTL is the duration for which a guest session cookie is valid.
// Exported for use in tests.
const GuestSessionTTL = guestSessionMaxAge * time.Second
