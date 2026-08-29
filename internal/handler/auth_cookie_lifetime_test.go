package handler

import (
	"net/http"
	"testing"
	"time"

	"github.com/konsulin-care/konsulin-app/internal/session"
)

// TestPostAuthCookie_sessionLifetimeMatchesSuperTokens verifies that the auth
// cookie expiry tracks the SuperTokens session lifetime (30d default) instead
// of the old independent 2h cap, so the Go-side AuthGuard never expires while
// the underlying session is still valid.
func TestPostAuthCookie_sessionLifetimeMatchesSuperTokens(t *testing.T) {
	srv := newAuthCookieServer(t)
	t.Cleanup(srv.Close)
	body := `{"userId":"u1","role_name":"Patient"}`
	resp := mustPost(t, srv, "/auth/cookie", body, &http.Cookie{
		Name:  "sAccessToken",
		Value: testJWT,
	})
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	authCookie := findCookie(resp, "auth")
	if authCookie == nil {
		t.Fatal("expected auth cookie")
		return
	}

	const minLifetime = 29 * 24 * time.Hour
	if authCookie.MaxAge < int(minLifetime.Seconds()) {
		t.Errorf("expected auth cookie MaxAge >= %d (29 days), got %d",
			int(minLifetime.Seconds()), authCookie.MaxAge)
	}

	sess := extractSessionFromCookie(t, authCookie)
	minExp := time.Now().Add(minLifetime).Unix()
	if sess.Exp < minExp {
		t.Errorf("expected session Exp >= %d (29 days out), got %d", minExp, sess.Exp)
	}

	// Sanity: the cookie must still decode to a valid session.
	if sess.UserID != "test-user" {
		t.Errorf("expected UserID test-user (verified), got %q", sess.UserID)
	}
}

// TestRoleSwitchCookieLifetimeMatchesSession verifies that the auth cookie
// written by the role switcher tracks the session lifetime too, so switching
// roles does not reintroduce an independent 2h expiry.
func TestRoleSwitchCookieLifetimeMatchesSession(t *testing.T) {
	var called bool
	backend := newBackendServer(t, "Practitioner", &called)
	defer backend.Close()

	srv := newRoleSwitchServer(t, RoleSwitchOptions{
		CookieName:     "auth",
		CookieSecure:   false,
		CookieSecret:   cookieTestSecret,
		BackendBaseURL: backend.URL,
	})
	defer srv.Close()

	cookieSession := &session.Session{
		UserID: "test-user",
		Roles:  []string{"Practitioner", "Clinic Admin"},
		Role:   "Practitioner",
	}
	authCookie := encodeAuthCookie(t, cookieSession)

	resp := mustPostRoleSwitch(t, srv, "Practitioner", authCookie)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", resp.StatusCode)
	}

	switched := findCookie(resp, "auth")
	if switched == nil {
		t.Fatal("expected auth cookie in response")
		return
	}

	const minLifetime = 29 * 24 * time.Hour
	if switched.MaxAge < int(minLifetime.Seconds()) {
		t.Errorf("expected auth cookie MaxAge >= %d (29 days), got %d",
			int(minLifetime.Seconds()), switched.MaxAge)
	}

	sess := extractSessionFromCookie(t, switched)
	minExp := time.Now().Add(minLifetime).Unix()
	if sess.Exp < minExp {
		t.Errorf("expected session Exp >= %d (29 days out), got %d", minExp, sess.Exp)
	}
	if sess.Role != "Practitioner" {
		t.Errorf("expected role Practitioner, got %q", sess.Role)
	}
}
