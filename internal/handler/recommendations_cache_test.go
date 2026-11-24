package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"
)

// newCacheTestHandler builds a handler whose specialty source is the given
// fake, so tests control call counts and blocking.
func newCacheTestHandler(fn func(context.Context) ([]string, error)) *RecommendationsHandler {
	h := NewRecommendationsHandler(RecommendationsOptions{})
	h.specialtiesFn = fn
	return h
}

// specialtiesResponse is the JSON body written by Specialties.
type specialtiesResponse struct {
	Specialties []string `json:"specialties"`
}

// fetchSpecialties invokes the handler once and decodes its response.
func fetchSpecialties(h *RecommendationsHandler) (int, []string) {
	req := httptest.NewRequest(http.MethodGet, "/api/recommendations/specialties", http.NoBody)
	rec := httptest.NewRecorder()
	h.Specialties(rec, req)
	var body specialtiesResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	return rec.Code, body.Specialties
}

// TestSpecialties_concurrentColdCacheSingleCall verifies that many simultaneous
// requests against an empty cache trigger exactly one service call and all
// return the same list.
func TestSpecialties_concurrentColdCacheSingleCall(t *testing.T) {
	const n = 16
	started := make(chan struct{}, n)
	release := make(chan struct{})
	want := []string{"Psychiatry", "Psychology"}

	var mu sync.Mutex
	calls := 0

	h := newCacheTestHandler(func(ctx context.Context) ([]string, error) {
		mu.Lock()
		calls++
		mu.Unlock()
		started <- struct{}{}
		select {
		case <-release:
			return want, nil
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	})

	type result struct {
		code int
		list []string
	}
	results := make(chan result, n)

	var wg sync.WaitGroup
	wg.Add(n)
	for i := 0; i < n; i++ {
		go func() {
			defer wg.Done()
			req := httptest.NewRequest(http.MethodGet, "/api/recommendations/specialties", http.NoBody)
			rec := httptest.NewRecorder()
			h.Specialties(rec, req)
			var body specialtiesResponse
			_ = json.Unmarshal(rec.Body.Bytes(), &body)
			results <- result{code: rec.Code, list: body.Specialties}
		}()
	}

	select {
	case <-started:
	case <-time.After(2 * time.Second):
		t.Fatal("service DistinctSpecialties was never called")
	}
	// Give the remaining goroutines time to join the in-flight fetch.
	time.Sleep(50 * time.Millisecond)
	close(release)
	wg.Wait()
	close(results)

	mu.Lock()
	gotCalls := calls
	mu.Unlock()
	if gotCalls != 1 {
		t.Errorf("expected 1 service call on a cold cache, got %d", gotCalls)
	}

	for res := range results {
		if res.code != http.StatusOK {
			t.Errorf("expected 200, got %d", res.code)
		}
		if len(res.list) != len(want) {
			t.Fatalf("expected %v, got %v", want, res.list)
		}
		for i := range want {
			if res.list[i] != want[i] {
				t.Errorf("expected %v, got %v", want, res.list)
				break
			}
		}
	}
}

// TestSpecialties_refreshesAfterTTL verifies that once the 60s TTL has elapsed
// the next request fetches a fresh list from the service.
func TestSpecialties_refreshesAfterTTL(t *testing.T) {
	var mu sync.Mutex
	calls := 0

	h := newCacheTestHandler(func(_ context.Context) ([]string, error) {
		mu.Lock()
		defer mu.Unlock()
		calls++
		return []string{"list-" + string(rune('0'+calls))}, nil
	})

	code, first := fetchSpecialties(h)
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}

	h.cacheMu.Lock()
	h.cache.at = time.Now().Add(-2 * specialtiesCacheTTL)
	h.cacheMu.Unlock()

	code, second := fetchSpecialties(h)
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}

	mu.Lock()
	gotCalls := calls
	mu.Unlock()
	if gotCalls != 2 {
		t.Errorf("expected 2 service calls after TTL expiry, got %d", gotCalls)
	}
	if len(first) == 0 || len(second) == 0 || first[0] == second[0] {
		t.Errorf("expected refreshed list after TTL, got %v then %v", first, second)
	}
}

// TestSpecialties_freshCacheSkipsService verifies that a still-valid cache
// entry serves without calling the service again.
func TestSpecialties_freshCacheSkipsService(t *testing.T) {
	var mu sync.Mutex
	calls := 0

	h := newCacheTestHandler(func(_ context.Context) ([]string, error) {
		mu.Lock()
		defer mu.Unlock()
		calls++
		return []string{"one"}, nil
	})

	fetchSpecialties(h)
	fetchSpecialties(h)

	mu.Lock()
	gotCalls := calls
	mu.Unlock()
	if gotCalls != 1 {
		t.Errorf("expected 1 service call within TTL, got %d", gotCalls)
	}
}
