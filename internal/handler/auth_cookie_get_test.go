package handler

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestGetAuthCookie_returnsAuthenticated(t *testing.T) {
	srv := newAuthCookieServer()
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
		t.Error("expected authenticated=false without sAccessToken")
	}

	// With auth cookie → authenticated: true
	req2, err := http.NewRequest(http.MethodGet, srv.URL+"/auth/cookie", http.NoBody)
	if err != nil {
		t.Fatal(err)
	}
	req2.AddCookie(&http.Cookie{Name: "auth", Value: "tok"})
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
		t.Error("expected authenticated=true with auth cookie")
	}
}
