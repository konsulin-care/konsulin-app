// Package client provides HTTP clients for external backend API calls.
package client

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

var anonymousSessionClient = &http.Client{Timeout: 10 * time.Second}

// AnonymousSessionResult holds the response from the anonymous-session API.
type AnonymousSessionResult struct {
	GuestID string
	Token   string
}

type anonymousSessionPayload struct {
	GuestID string `json:"guest_id"`
	IsNew   bool   `json:"is_new"`
	Role    string `json:"role"`
	Token   string `json:"token"`
}

type anonymousSessionResponse struct {
	Success bool                      `json:"success"`
	Message string                    `json:"message"`
	Data    anonymousSessionPayload   `json:"data"`
}

// FetchAnonymousSession POSTs to the anonymous-session endpoint and returns
// the guest_id and JWT token. Makes at most one API call per guest (result
// cached in cookie by caller).
func FetchAnonymousSession(backendAPIBaseURL string) (*AnonymousSessionResult, error) {
	url := strings.TrimRight(backendAPIBaseURL, "/") + "/auth/anonymous-session"

	resp, err := anonymousSessionClient.Post(url, "application/json", http.NoBody)
	if err != nil {
		return nil, fmt.Errorf("anonymous session request: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("anonymous session read body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("anonymous session API returned HTTP %d", resp.StatusCode)
	}

	var result anonymousSessionResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("anonymous session decode: %w", err)
	}

	if !result.Success {
		return nil, fmt.Errorf("anonymous session API error: %s", result.Message)
	}

	if result.Data.GuestID == "" {
		return nil, errors.New("anonymous session: empty guest_id in response")
	}

	return &AnonymousSessionResult{
		GuestID: result.Data.GuestID,
		Token:   result.Data.Token,
	}, nil
}
