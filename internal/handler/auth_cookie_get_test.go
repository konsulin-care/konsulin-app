package handler

import (
	"encoding/json"
	"net/http"
	"testing"
)

// testJWTWithActiveRoleClinic is a JWT whose payload carries
// {"st-role":{"v":["Patient","Practitioner","Clinic Admin"]},"st-active-role":"Clinic Admin"}.
const testJWTWithActiveRoleClinic = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJleHAiOjk5OTk5OTk5OTksInN0LXJvbGUiOnsidiI6WyJQYXRpZW50IiwiUHJhY3RpdGlvbmVyIiwiQ2xpbmljIEFkbWluIl19LCJzdC1hY3RpdmUtcm9sZSI6IkNsaW5pYyBBZG1pbiJ9.ZmFrZS1zaWc"

func TestGetAuthCookie_returnsActiveRole(t *testing.T) {
	srv := newAuthCookieServer(t)
	t.Cleanup(srv.Close)

	// POST to create a signed auth cookie, sending the sAccessToken that
	// carries the st-active-role claim.
	postResp := mustPost(t, srv, "/auth/cookie",
		`{"userId":"u1","role_name":"Patient"}`,
		&http.Cookie{Name: "sAccessToken", Value: testJWTWithActiveRoleClinic})
	if postResp.StatusCode != http.StatusOK {
		t.Fatalf("POST auth/cookie failed: %d", postResp.StatusCode)
	}
	authCookie := findCookie(postResp, "auth")
	if authCookie == nil {
		t.Fatal("expected auth cookie from POST")
	}
	postResp.Body.Close()

	req, err := http.NewRequest(http.MethodGet, srv.URL+"/auth/cookie", http.NoBody)
	if err != nil {
		t.Fatal(err)
	}
	req.AddCookie(authCookie)
	req.AddCookie(&http.Cookie{Name: "sAccessToken", Value: testJWTWithActiveRoleClinic})
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var body struct {
		Authenticated bool   `json:"authenticated"`
		ActiveRole    string `json:"active_role"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode body: %v", err)
	}
	if !body.Authenticated {
		t.Error("expected authenticated=true with valid auth cookie")
	}
	if body.ActiveRole != "Clinic Admin" {
		t.Errorf("expected active_role %q, got %q", "Clinic Admin", body.ActiveRole)
	}
}

func TestGetAuthCookie_omitsActiveRoleWithoutToken(t *testing.T) {
	srv := newAuthCookieServer(t)
	t.Cleanup(srv.Close)

	// Auth cookie without any sAccessToken cookie → active_role omitted.
	postResp := mustPost(t, srv, "/auth/cookie",
		`{"userId":"u1","role_name":"Patient"}`,
		&http.Cookie{Name: "sAccessToken", Value: testJWT})
	if postResp.StatusCode != http.StatusOK {
		t.Fatalf("POST auth/cookie failed: %d", postResp.StatusCode)
	}
	authCookie := findCookie(postResp, "auth")
	if authCookie == nil {
		t.Fatal("expected auth cookie from POST")
	}
	postResp.Body.Close()

	req, err := http.NewRequest(http.MethodGet, srv.URL+"/auth/cookie", http.NoBody)
	if err != nil {
		t.Fatal(err)
	}
	req.AddCookie(authCookie)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	var body struct {
		ActiveRole string `json:"active_role"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode body: %v", err)
	}
	if body.ActiveRole != "" {
		t.Errorf("expected empty active_role without sAccessToken, got %q", body.ActiveRole)
	}
}

func TestGetAuthCookie_returnsAuthenticated(t *testing.T) {
	srv := newAuthCookieServer(t)
	t.Cleanup(srv.Close)

	// No auth cookie → authenticated: false
	req, err := http.NewRequest(http.MethodGet, srv.URL+"/auth/cookie", http.NoBody)
	if err != nil {
		t.Fatal(err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var body struct {
		Authenticated bool `json:"authenticated"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode body: %v", err)
	}
	if body.Authenticated {
		t.Error("expected authenticated=false without auth cookie")
	}

	// With auth cookie → authenticated: true
	// First POST to create a properly signed cookie, then use it for GET.
	postResp := mustPost(t, srv, "/auth/cookie",
		`{"userId":"u1","role_name":"Patient"}`,
		&http.Cookie{Name: "sAccessToken", Value: testJWT})
	if postResp.StatusCode != http.StatusOK {
		t.Fatalf("POST auth/cookie failed: %d", postResp.StatusCode)
	}
	authCookie := findCookie(postResp, "auth")
	if authCookie == nil {
		t.Fatal("expected auth cookie from POST")
	}
	postResp.Body.Close()

	req2, err := http.NewRequest(http.MethodGet, srv.URL+"/auth/cookie", http.NoBody)
	if err != nil {
		t.Fatal(err)
	}
	req2.AddCookie(authCookie)
	resp2, err := http.DefaultClient.Do(req2)
	if err != nil {
		t.Fatal(err)
	}
	defer resp2.Body.Close()

	if resp2.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp2.StatusCode)
	}

	if err := json.NewDecoder(resp2.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode body: %v", err)
	}
	if !body.Authenticated {
		t.Error("expected authenticated=true with valid auth cookie")
	}
}
