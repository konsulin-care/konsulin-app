package middleware

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/url"
	"time"

	"github.com/konsulin-care/konsulin-app/internal/client"
	"github.com/konsulin-care/konsulin-app/internal/session"
)

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
			result, err := client.FetchAnonymousSession(opts.BackendAPIURL)
			if err != nil {
				slog.Warn("optional auth: failed to create anonymous session, proceeding without GuestID",
					"path", r.URL.Path, "err", err)
				sess = &session.Session{Role: "Guest"}
				ctx := session.ContextWithSession(r.Context(), sess)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
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
