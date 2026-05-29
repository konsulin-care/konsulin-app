package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/konsulin-care/konsulin-app/internal/session"
)

const testSecret = "optional-auth-test-secret"

func signedCookieValue(value string) string {
	return url.QueryEscape(session.SignCookieValue(value, testSecret))
}

func newOptionalAuthRouter(apiServer *httptest.Server) *chi.Mux {
	r := chi.NewRouter()
	apiURL := ""
	if apiServer != nil {
		apiURL = apiServer.URL
	}
	r.Use(OptionalAuth(OptionalAuthOptions{
		AuthCookieName:         "auth",
		GuestSessionCookieName: "guest_session",
		CookieSecret:           testSecret,
		BackendAPIURL:          apiURL,
		CookieSecure:           false,
	}))
	return r
}

func mockAnonymousSessionAPI(guestID string) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{
			"success": true, "message": "ok",
			"data": map[string]any{"guest_id": guestID, "is_new": true, "role": "guest",
				"token": "eyJhbGciOiJIUzI1NiJ9.eyJndWVzdF9pZCI6IjEyMyJ9.test",
			},
		})
	}))
}

func TestOptionalAuth_noCookies_createsSession(t *testing.T) {
	ResetAnonSessionCache()
	apiServer := mockAnonymousSessionAPI("test-guest-abc")
	t.Cleanup(apiServer.Close)
	r := newOptionalAuthRouter(apiServer)
	var gotSession *session.Session
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		s, ok := session.SessionFromContext(r.Context())
		if !ok {
			t.Error("expected session in context")
		}
		gotSession = s
		w.WriteHeader(http.StatusOK)
	})
	server := httptest.NewServer(r)
	t.Cleanup(server.Close)
	resp, err := http.Get(server.URL + "/")
	if err != nil {
		t.Fatalf("GET / failed: %v", err)
	}
	resp.Body.Close()
	if gotSession == nil {
		t.Fatal("expected session to be set")
	}
	if gotSession.Role != "Guest" {
		t.Errorf("expected Role Guest, got %q", gotSession.Role)
	}
	if gotSession.GuestID != "test-guest-abc" {
		t.Errorf("expected GuestID test-guest-abc, got %q", gotSession.GuestID)
	}
	assertGuestSessionCookie(t, resp.Cookies(), "test-guest-abc")
}

func TestOptionalAuth_authCookie_realSession(t *testing.T) {
	apiServer := mockAnonymousSessionAPI("should-not-be-called")
	t.Cleanup(apiServer.Close)
	r := newOptionalAuthRouter(apiServer)
	var gotSession *session.Session
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		s, ok := session.SessionFromContext(r.Context())
		if !ok {
			t.Error("expected session in context")
		}
		gotSession = s
		w.WriteHeader(http.StatusOK)
	})
	authJSON, _ := json.Marshal(map[string]string{"userId": "u1", "role_name": "Patient"})
	cookieVal := signedCookieValue(string(authJSON))
	server := httptest.NewServer(r)
	t.Cleanup(server.Close)
	req, _ := http.NewRequest(http.MethodGet, server.URL+"/", http.NoBody)
	req.Header.Set("Cookie", "auth="+cookieVal)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("GET / failed: %v", err)
	}
	resp.Body.Close()
	if gotSession == nil {
		t.Fatal("expected session to be set")
	}
	if gotSession.UserID != "u1" {
		t.Errorf("expected UserID u1, got %q", gotSession.UserID)
	}
	if gotSession.Role != "Patient" {
		t.Errorf("expected Role Patient, got %q", gotSession.Role)
	}
}

func TestOptionalAuth_guestCookie_guestSession(t *testing.T) {
	apiServer := mockAnonymousSessionAPI("should-not-be-called")
	t.Cleanup(apiServer.Close)
	r := newOptionalAuthRouter(apiServer)
	var gotSession *session.Session
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		s, ok := session.SessionFromContext(r.Context())
		if !ok {
			t.Error("expected session in context")
		}
		gotSession = s
		w.WriteHeader(http.StatusOK)
	})
	cookieVal := url.QueryEscape(`{"guestId":"existing-guest-xyz"}`)
	server := httptest.NewServer(r)
	t.Cleanup(server.Close)
	req, _ := http.NewRequest(http.MethodGet, server.URL+"/", http.NoBody)
	req.Header.Set("Cookie", "guest_session="+cookieVal)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("GET / failed: %v", err)
	}
	resp.Body.Close()
	if gotSession == nil {
		t.Fatal("expected session to be set")
	}
	if gotSession.Role != "Guest" {
		t.Errorf("expected Role Guest, got %q", gotSession.Role)
	}
	if gotSession.GuestID != "existing-guest-xyz" {
		t.Errorf("expected GuestID existing-guest-xyz, got %q", gotSession.GuestID)
	}
}

func TestOptionalAuth_apiUnavailable_fallback(t *testing.T) {
	ResetAnonSessionCache()
	// Start a server that will be closed immediately — simulating unavailable API
	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	apiServer.Close()

	r := newOptionalAuthRouter(apiServer)
	var gotSession *session.Session
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		s, ok := session.SessionFromContext(r.Context())
		if !ok {
			t.Error("expected session in context")
		}
		gotSession = s
		w.WriteHeader(http.StatusOK)
	})

	server := httptest.NewServer(r)
	t.Cleanup(server.Close)

	resp, err := http.Get(server.URL + "/")
	if err != nil {
		t.Fatalf("GET / failed: %v", err)
	}
	resp.Body.Close()

	if gotSession == nil {
		t.Fatal("expected session to be set despite API failure")
	}
	if gotSession.Role != "Guest" {
		t.Errorf("expected Role Guest, got %q", gotSession.Role)
	}
	if gotSession.GuestID != "" {
		t.Errorf("expected empty GuestID on API failure, got %q", gotSession.GuestID)
	}
}

func TestOptionalAuth_authCookieOverridesGuest(t *testing.T) {
	apiServer := mockAnonymousSessionAPI("should-not-be-called")
	t.Cleanup(apiServer.Close)

	r := newOptionalAuthRouter(apiServer)
	var gotSession *session.Session
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		s, ok := session.SessionFromContext(r.Context())
		if !ok {
			t.Error("expected session in context")
		}
		gotSession = s
		w.WriteHeader(http.StatusOK)
	})

	authJSON, _ := json.Marshal(map[string]string{
		"userId":    "u1",
		"role_name": "Practitioner",
	})
	authCookieVal := signedCookieValue(string(authJSON))
	guestCookieVal := url.QueryEscape(`{"guestId":"guest-123"}`)

	server := httptest.NewServer(r)
	t.Cleanup(server.Close)

	req, err := http.NewRequest(http.MethodGet, server.URL+"/", http.NoBody)
	if err != nil {
		t.Fatalf("failed to create request: %v", err)
	}
	req.Header.Set("Cookie", "auth="+authCookieVal+"; guest_session="+guestCookieVal)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("GET / failed: %v", err)
	}
	resp.Body.Close()

	if gotSession == nil {
		t.Fatal("expected session to be set")
	}
	if gotSession.UserID != "u1" {
		t.Errorf("expected UserID u1, got %q", gotSession.UserID)
	}
	if gotSession.Role != "Practitioner" {
		t.Errorf("expected Role Practitioner, got %q", gotSession.Role)
	}
	if gotSession.GuestID != "" {
		t.Errorf("expected empty GuestID for real session, got %q", gotSession.GuestID)
	}
}

type guestCookieCheck struct {
	GuestID string `json:"guestId"`
	Token   string `json:"token"`
}

func findGuestSessionCookie(cookies []*http.Cookie) (*guestCookieCheck, *http.Cookie, bool) {
	for _, c := range cookies {
		if c.Name != "guest_session" {
			continue
		}
		decoded, err := url.QueryUnescape(c.Value)
		if err != nil {
			return nil, nil, false
		}
		var data guestCookieCheck
		if err := json.Unmarshal([]byte(decoded), &data); err != nil {
			return nil, nil, false
		}
		if data.GuestID == "" {
			return nil, nil, false
		}
		return &data, c, true
	}
	return nil, nil, false
}

func assertGuestSessionCookie(t *testing.T, cookies []*http.Cookie, wantGuestID string) {
	t.Helper()
	data, c, found := findGuestSessionCookie(cookies)
	if !found {
		t.Error("expected guest_session cookie in response")
		return
	}
	if data.GuestID != wantGuestID {
		t.Errorf("expected cookie GuestID %q, got %q", wantGuestID, data.GuestID)
	}
	if data.Token == "" {
		t.Error("expected non-empty token in guest_session cookie")
	}
	if c.MaxAge != guestSessionMaxAge {
		t.Errorf("expected MaxAge %d, got %d", guestSessionMaxAge, c.MaxAge)
	}
	if c.HttpOnly {
		t.Error("expected HttpOnly=false for guest_session cookie")
	}
}
