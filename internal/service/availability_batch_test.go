package service

import (
	"encoding/json"
	"testing"
	"time"
)

func TestBusySlotPath_containsAllParams(t *testing.T) {
	now := time.Date(2026, 6, 8, 1, 0, 0, 0, time.UTC)
	path := BusySlotPath("Schedule/sch-1", now)

	if path == "" {
		t.Fatal("expected non-empty path")
	}
	if !contains(path, "/fhir/Slot") {
		t.Errorf("expected /fhir/Slot prefix, got %s", path)
	}
	if !contains(path, "schedule=Schedule") {
		t.Errorf("expected schedule param, got %s", path)
	}
	if !contains(path, "status=busy,busy-unavailable,busy-tentative") {
		t.Errorf("expected busy statuses, got %s", path)
	}
	if !contains(path, "start=ge") || !contains(path, "start=le") {
		t.Errorf("expected start bounds, got %s", path)
	}
}

func TestBusySlotPath_14DayHorizon(t *testing.T) {
	now := time.Date(2026, 6, 8, 1, 0, 0, 0, time.UTC)
	path := BusySlotPath("Schedule/sch-1", now)

	// end should be now + 14 days = 2026-06-22T01:00:00Z
	if !contains(path, "2026-06-22") {
		t.Errorf("expected 14-day horizon end date, got %s", path)
	}
}

func TestParseBusySlotsBundle_valid(t *testing.T) {
	bundle := map[string]any{
		"resourceType": "Bundle",
		"type":         "searchset",
		"entry": []map[string]any{
			{
				"resource": map[string]any{
					"start": "2026-06-08T02:00:00Z",
					"end":   "2026-06-08T03:00:00Z",
				},
			},
			{
				"resource": map[string]any{
					"start": "2026-06-09T04:00:00Z",
					"end":   "2026-06-09T05:00:00Z",
				},
			},
		},
	}
	data, err := json.Marshal(bundle)
	if err != nil {
		t.Fatalf("marshal test bundle: %v", err)
	}

	slots, err := ParseBusySlotsBundle(json.RawMessage(data))
	if err != nil {
		t.Fatalf("ParseBusySlotsBundle returned error: %v", err)
	}
	if len(slots) != 2 {
		t.Fatalf("expected 2 slots, got %d", len(slots))
	}
	if slots[0].Start != time.Date(2026, 6, 8, 2, 0, 0, 0, time.UTC) {
		t.Errorf("expected first slot start 2026-06-08T02:00:00Z, got %s", slots[0].Start)
	}
	if slots[1].End != time.Date(2026, 6, 9, 5, 0, 0, 0, time.UTC) {
		t.Errorf("expected second slot end 2026-06-09T05:00:00Z, got %s", slots[1].End)
	}
}

func TestParseBusySlotsBundle_empty(t *testing.T) {
	bundle := map[string]any{
		"resourceType": "Bundle",
		"type":         "searchset",
		"entry":        []map[string]any{},
	}
	data, err := json.Marshal(bundle)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	slots, err := ParseBusySlotsBundle(json.RawMessage(data))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(slots) != 0 {
		t.Errorf("expected 0 slots, got %d", len(slots))
	}
}

func TestParseBusySlotsBundle_malformed(t *testing.T) {
	_, err := ParseBusySlotsBundle(json.RawMessage(`{"garbage`))
	if err == nil {
		t.Fatal("expected error on malformed JSON")
	}
}

func TestParseBusySlotsBundle_skipsBadTimestamps(t *testing.T) {
	bundle := map[string]any{
		"entry": []map[string]any{
			{
				"resource": map[string]any{
					"start": "not-a-date",
					"end":   "2026-06-08T03:00:00Z",
				},
			},
			{
				"resource": map[string]any{
					"start": "2026-06-09T04:00:00Z",
					"end":   "2026-06-09T05:00:00Z",
				},
			},
		},
	}
	data, err := json.Marshal(bundle)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	slots, err := ParseBusySlotsBundle(json.RawMessage(data))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(slots) != 1 {
		t.Fatalf("expected 1 valid slot, got %d", len(slots))
	}
}

func TestComputeNextSlot_withBatchedBusySlots(t *testing.T) {
	now := mondayMorning()
	windows := windowsMonFri()
	offset := ParseTZOffset("+07:00")
	busy := []BusySlot{
		{
			Start: time.Date(2026, 6, 8, 1, 0, 0, 0, time.UTC), // 08:00 WIB
			End:   time.Date(2026, 6, 8, 3, 0, 0, 0, time.UTC), // 10:00 WIB
		},
	}

	slot := ComputeNextSlot(windows, busy, now, offset, 60)
	if slot == nil {
		t.Fatal("expected a slot, got nil")
	}
	// First slot at 09:00 WIB is busy (overlaps 08:00-10:00), so next free is 10:00 WIB = 03:00Z
	if slot.Start != "2026-06-08T03:00:00Z" {
		t.Errorf("expected 10:00 WIB = 03:00Z, got %s", slot.Start)
	}
	if slot.End != "2026-06-08T04:00:00Z" {
		t.Errorf("expected 11:00 WIB = 04:00Z end, got %s", slot.End)
	}
}

func mondayMorning() time.Time {
	// 2026-06-08 is a Monday.
	return time.Date(2026, 6, 8, 1, 0, 0, 0, time.UTC) // 08:00 WIB
}

func windowsMonFri() []AvailableTimeWindow {
	return []AvailableTimeWindow{
		{
			DaysOfWeek: []string{"mon", "tue", "wed", "thu", "fri"},
			StartTime:  "08:00:00",
			EndTime:    "17:00:00",
		},
	}
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(s) > 0 && containsSubstr(s, sub))
}

func containsSubstr(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
