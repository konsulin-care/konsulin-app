package proxycache

import (
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// fixedClock returns a Now func reading from the returned pointer.
func fixedClock(start time.Time) (func() time.Time, *time.Time) {
	current := start
	now := func() time.Time { return current }
	return now, &current
}

func TestGetExpiresAtTTL(t *testing.T) {
	base := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	tests := []struct {
		name string
		at   time.Time
		hit  bool
	}{
		{name: "before expiry", at: base.Add(59 * time.Minute), hit: true},
		{name: "at expiry", at: base.Add(time.Hour), hit: false},
		{name: "after expiry", at: base.Add(2 * time.Hour), hit: false},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			nowFunc, current := fixedClock(base)
			c := New(Options{TTL: time.Hour, MaxEntries: 10, Now: nowFunc})
			c.Set("k", "Patient", Entry{Status: 200, Body: []byte("x"), StoredAt: base})
			*current = tc.at
			if _, ok := c.Get("k"); ok != tc.hit {
				t.Fatalf("expected hit=%v at %v, got %v", tc.hit, tc.at, ok)
			}
		})
	}
}

func TestGetEvictsExpiredEntry(t *testing.T) {
	base := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	nowFunc, current := fixedClock(base)
	c := New(Options{TTL: time.Hour, MaxEntries: 10, MaxTotalBytes: 100, Now: nowFunc})
	c.Set("k", "Patient", Entry{Body: []byte("abc"), StoredAt: base})
	*current = base.Add(2 * time.Hour)
	if _, ok := c.Get("k"); ok {
		t.Fatalf("expected miss for expired entry")
	}
	c.mu.Lock()
	total := c.totalBytes
	remaining := len(c.entries)
	c.mu.Unlock()
	if total != 0 || remaining != 0 {
		t.Fatalf("expected expired entry evicted, got total=%d remaining=%d", total, remaining)
	}
}

func TestSetLimitsAndEviction(t *testing.T) {
	base := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	tests := []struct {
		name          string
		opts          Options
		sets          []Entry
		wantPresent   []bool
		wantTotalByte int
	}{
		{
			name:          "skips oversized entry",
			opts:          Options{MaxEntryBytes: 4},
			sets:          []Entry{{Body: []byte("12345")}},
			wantPresent:   []bool{false},
			wantTotalByte: 0,
		},
		{
			name:          "evicts oldest by entry count",
			opts:          Options{MaxEntries: 2},
			sets:          []Entry{{Body: []byte("a")}, {Body: []byte("b")}, {Body: []byte("c")}},
			wantPresent:   []bool{false, true, true},
			wantTotalByte: 2,
		},
		{
			name:          "evicts oldest by total bytes",
			opts:          Options{MaxTotalBytes: 6},
			sets:          []Entry{{Body: []byte("aaa")}, {Body: []byte("bbb")}, {Body: []byte("ccc")}},
			wantPresent:   []bool{false, true, true},
			wantTotalByte: 6,
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			tc.opts.Now = func() time.Time { return base }
			tc.opts.TTL = time.Hour
			c := New(tc.opts)
			keys := make([]string, len(tc.sets))
			for i, e := range tc.sets {
				keys[i] = string(rune('a' + i))
				e.StoredAt = base
				c.Set(keys[i], "Patient", e)
			}
			for i, key := range keys {
				if _, ok := c.Get(key); ok != tc.wantPresent[i] {
					t.Fatalf("key %q expected present=%v, got %v", key, tc.wantPresent[i], ok)
				}
			}
			c.mu.Lock()
			total := c.totalBytes
			c.mu.Unlock()
			if total != tc.wantTotalByte {
				t.Fatalf("expected total bytes %d, got %d", tc.wantTotalByte, total)
			}
		})
	}
}

func TestInvalidateType(t *testing.T) {
	base := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	nowFunc, _ := fixedClock(base)
	c := New(Options{TTL: time.Hour, MaxEntries: 10, Now: nowFunc})
	c.Set("p1", "Patient", Entry{Body: []byte("1"), StoredAt: base})
	c.Set("o1", "Observation", Entry{Body: []byte("2"), StoredAt: base})
	c.Set("p2", "Patient", Entry{Body: []byte("3"), StoredAt: base})

	c.InvalidateType("Patient")
	if _, ok := c.Get("p1"); ok {
		t.Fatalf("expected p1 invalidated")
	}
	if _, ok := c.Get("p2"); ok {
		t.Fatalf("expected p2 invalidated")
	}
	if _, ok := c.Get("o1"); !ok {
		t.Fatalf("expected o1 retained")
	}
	c.InvalidateType("*")
	if _, ok := c.Get("o1"); ok {
		t.Fatalf("expected wildcard to clear all entries")
	}
	c.mu.Lock()
	remaining, total := len(c.entries), c.totalBytes
	c.mu.Unlock()
	if remaining != 0 || total != 0 {
		t.Fatalf("expected empty cache, got entries=%d bytes=%d", remaining, total)
	}
}

func TestDoSingleFlight(t *testing.T) {
	base := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	nowFunc, _ := fixedClock(base)
	c := New(Options{TTL: time.Hour, MaxEntries: 10, Now: nowFunc})

	var loads int32
	release := make(chan struct{})
	started := make(chan struct{})
	load := func() (Entry, string, bool, error) {
		atomic.AddInt32(&loads, 1)
		close(started)
		<-release
		return Entry{Status: 200, Body: []byte("payload")}, "Patient", true, nil
	}

	const callers = 8
	results := make([]Entry, callers)
	errs := make([]error, callers)
	var wg sync.WaitGroup
	wg.Add(callers)
	for i := 0; i < callers; i++ {
		go func(idx int) {
			defer wg.Done()
			results[idx], _, errs[idx] = c.Do("fhir/Patient", load)
		}(i)
	}
	<-started
	close(release)
	wg.Wait()

	if got := atomic.LoadInt32(&loads); got != 1 {
		t.Fatalf("expected loader invoked once, got %d", got)
	}
	for i, e := range results {
		if errs[i] != nil {
			t.Fatalf("caller %d unexpected error: %v", i, errs[i])
		}
		if string(e.Body) != "payload" || e.Status != 200 {
			t.Fatalf("caller %d got unexpected entry %+v", i, e)
		}
	}
	if got, ok := c.Get("fhir/Patient"); !ok || string(got.Body) != "payload" {
		t.Fatalf("expected loaded entry cached, got %+v ok=%v", got, ok)
	}
}

func TestDoLoadResults(t *testing.T) {
	base := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	tests := []struct {
		name      string
		cacheable bool
		err       error
		wantCache bool
	}{
		{name: "cacheable success", cacheable: true, wantCache: true},
		{name: "uncacheable success", cacheable: false, wantCache: false},
		{name: "cacheable error", cacheable: true, err: errors.New("boom"), wantCache: false},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			nowFunc, _ := fixedClock(base)
			c := New(Options{TTL: time.Hour, MaxEntries: 10, Now: nowFunc})
			entry, hit, err := c.Do("k", func() (Entry, string, bool, error) {
				return Entry{Status: 200, Body: []byte("x")}, "Patient", tc.cacheable, tc.err
			})
			if hit {
				t.Fatalf("expected hit=false for the loading caller")
			}
			if tc.err != nil && err == nil {
				t.Fatalf("expected loader error propagated")
			}
			if entry.Status != 200 {
				t.Fatalf("expected loader entry returned, got %+v", entry)
			}
			if _, ok := c.Get("k"); ok != tc.wantCache {
				t.Fatalf("expected cached=%v, got %v", tc.wantCache, ok)
			}
		})
	}
}

func TestDoServesCacheOnSecondCall(t *testing.T) {
	base := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	nowFunc, _ := fixedClock(base)
	c := New(Options{TTL: time.Hour, MaxEntries: 10, Now: nowFunc})
	var loads int32
	load := func() (Entry, string, bool, error) {
		atomic.AddInt32(&loads, 1)
		return Entry{Status: 200, Body: []byte("x")}, "Patient", true, nil
	}
	if _, hit, _ := c.Do("k", load); hit {
		t.Fatalf("expected first Do to be a miss")
	}
	if _, hit, _ := c.Do("k", load); !hit {
		t.Fatalf("expected second Do to be a hit")
	}
	if got := atomic.LoadInt32(&loads); got != 1 {
		t.Fatalf("expected loader invoked once, got %d", got)
	}
}
