package service

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// mondayMorning is an absolute instant: Monday 2026-06-08 08:00 WIB = 01:00 UTC.
func mondayMorning() time.Time {
	return time.Date(2026, 6, 8, 1, 0, 0, 0, time.UTC)
}

func windowsMonFri() []AvailableTimeWindow {
	return []AvailableTimeWindow{
		{DaysOfWeek: []string{"mon", "tue", "wed", "thu", "fri"}, StartTime: "09:00", EndTime: "17:00"},
	}
}

// availabilityBackend serves a fixed busy Slot bundle for any Slot query.
func availabilityBackend(t *testing.T, busy ...string) *httptest.Server {
	t.Helper()
	entries := []map[string]any{}
	for i := 0; i < len(busy); i += 2 {
		entries = append(entries, map[string]any{
			"resource": map[string]any{
				"resourceType": "Slot",
				"id":           "slot-busy",
				"status":       "busy",
				"start":        busy[i],
				"end":          busy[i+1],
			},
		})
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/fhir+json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"resourceType": "Bundle",
			"type":         "searchset",
			"total":        len(entries),
			"entry":        entries,
		})
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestNextFreeSlot_earliestWindowInLocalDay(t *testing.T) {
	srv := availabilityBackend(t)
	slot, err := NextFreeSlot(context.Background(), NextFreeSlotParams{
		BackendBaseURL:  srv.URL,
		Client:          srv.Client(),
		ScheduleID:      "Schedule/sch-1",
		Windows:         windowsMonFri(),
		DurationMinutes: 60,
		Now:             mondayMorning(),
		TZOffset:        "+07:00",
	})
	if err != nil {
		t.Fatalf("NextFreeSlot returned error: %v", err)
	}
	if slot == nil {
		t.Fatal("expected a next slot, got nil")
	}
	if slot.Start != "2026-06-08T02:00:00Z" {
		t.Errorf("expected 09:00 WIB = 02:00Z, got %s", slot.Start)
	}
	if slot.End != "2026-06-08T03:00:00Z" {
		t.Errorf("expected 03:00Z end, got %s", slot.End)
	}
}

func TestNextFreeSlot_skipsBusySlot(t *testing.T) {
	srv := availabilityBackend(t,
		"2026-06-08T01:00:00Z", "2026-06-08T03:00:00Z", // 08:00-10:00 WIB busy
	)
	slot, err := NextFreeSlot(context.Background(), NextFreeSlotParams{
		BackendBaseURL:  srv.URL,
		Client:          srv.Client(),
		ScheduleID:      "Schedule/sch-1",
		Windows:         windowsMonFri(),
		DurationMinutes: 60,
		Now:             mondayMorning(),
		TZOffset:        "+07:00",
	})
	if err != nil {
		t.Fatalf("NextFreeSlot returned error: %v", err)
	}
	if slot == nil {
		t.Fatal("expected a next slot after busy, got nil")
	}
	if slot.Start != "2026-06-08T03:00:00Z" {
		t.Errorf("expected 10:00 WIB = 03:00Z, got %s", slot.Start)
	}
}

func TestNextFreeSlot_rollsToNextDayWhenTodayElapsed(t *testing.T) {
	now := time.Date(2026, 6, 8, 10, 0, 0, 0, time.UTC) // 17:00 WIB Monday
	srv := availabilityBackend(t)
	slot, err := NextFreeSlot(context.Background(), NextFreeSlotParams{
		BackendBaseURL:  srv.URL,
		Client:          srv.Client(),
		ScheduleID:      "Schedule/sch-1",
		Windows:         windowsMonFri(),
		DurationMinutes: 60,
		Now:             now,
		TZOffset:        "+07:00",
	})
	if err != nil {
		t.Fatalf("NextFreeSlot returned error: %v", err)
	}
	if slot == nil {
		t.Fatal("expected next-day slot, got nil")
	}
	if slot.Start != "2026-06-09T02:00:00Z" {
		t.Errorf("expected Tuesday 09:00 WIB = 02:00Z, got %s", slot.Start)
	}
}

func TestNextFreeSlot_nullableWhenNoWindows(t *testing.T) {
	srv := availabilityBackend(t)
	slot, err := NextFreeSlot(context.Background(), NextFreeSlotParams{
		BackendBaseURL:  srv.URL,
		Client:          srv.Client(),
		ScheduleID:      "Schedule/sch-1",
		DurationMinutes: 60,
		Now:             mondayMorning(),
		TZOffset:        "+07:00",
	})
	if err != nil {
		t.Fatalf("NextFreeSlot returned error: %v", err)
	}
	if slot != nil {
		t.Errorf("expected nil slot, got %v", slot)
	}
}

func TestNextFreeSlot_respectsTimezoneOffset(t *testing.T) {
	// Same absolute instant; with offset Z the local 09:00 is 09:00Z.
	now := time.Date(2026, 6, 8, 8, 0, 0, 0, time.UTC)
	srv := availabilityBackend(t)
	slot, err := NextFreeSlot(context.Background(), NextFreeSlotParams{
		BackendBaseURL:  srv.URL,
		Client:          srv.Client(),
		ScheduleID:      "Schedule/sch-1",
		Windows:         windowsMonFri(),
		DurationMinutes: 60,
		Now:             now,
		TZOffset:        "Z",
	})
	if err != nil {
		t.Fatalf("NextFreeSlot returned error: %v", err)
	}
	if slot == nil || slot.Start != "2026-06-08T09:00:00Z" {
		t.Errorf("expected 09:00Z with Z offset, got %v", slot)
	}
}

func TestNextFreeSlot_queriesBusySlotsForSchedule(t *testing.T) {
	var captured string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		captured = r.URL.RequestURI()
		w.Header().Set("Content-Type", "application/fhir+json")
		_ = json.NewEncoder(w).Encode(map[string]any{"resourceType": "Bundle", "type": "searchset", "total": 0, "entry": []any{}})
	}))
	t.Cleanup(srv.Close)

	_, err := NextFreeSlot(context.Background(), NextFreeSlotParams{
		BackendBaseURL:  srv.URL,
		Client:          srv.Client(),
		ScheduleID:      "Schedule/sch-1",
		Windows:         windowsMonFri(),
		DurationMinutes: 30,
		Now:             mondayMorning(),
		TZOffset:        "+07:00",
	})
	if err != nil {
		t.Fatalf("NextFreeSlot returned error: %v", err)
	}
	if !strings.Contains(captured, "schedule=Schedule%2Fsch-1") && !strings.Contains(captured, "schedule=Schedule/sch-1") {
		t.Errorf("expected schedule param in query, got %s", captured)
	}
	if !strings.Contains(captured, "status=busy,busy-unavailable,busy-tentative") {
		t.Errorf("expected explicit busy statuses in query, got %s", captured)
	}
	if !strings.Contains(captured, "start=ge") || !strings.Contains(captured, "start=le") {
		t.Errorf("expected start window bounds, got %s", captured)
	}
}

func TestNextFreeSlot_backendError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"boom"}`))
	}))
	t.Cleanup(srv.Close)

	if _, err := NextFreeSlot(context.Background(), NextFreeSlotParams{
		BackendBaseURL:  srv.URL,
		Client:          srv.Client(),
		ScheduleID:      "Schedule/sch-1",
		Windows:         windowsMonFri(),
		DurationMinutes: 60,
		Now:             mondayMorning(),
		TZOffset:        "+07:00",
	}); err == nil {
		t.Fatal("expected error on backend 500")
	}
}