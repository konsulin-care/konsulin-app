package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	// availabilityHorizonDays is the rolling window for next-free-slot search.
	availabilityHorizonDays = 14
	// defaultDurationMinutes is used when a service carries no duration.
	defaultDurationMinutes = 30
	// defaultTZOffset is the assumed practitioner timezone when none is supplied.
	defaultTZOffset = "+07:00"
	// busyStatusQuery lists the explicit non-free Slot statuses (Blaze lacks :not).
	busyStatusQuery = "busy,busy-unavailable,busy-tentative"
)

// NextFreeSlotParams configures the next-free-slot computation.
type NextFreeSlotParams struct {
	BackendBaseURL  string
	Client          *http.Client
	ScheduleID      string
	Windows         []AvailableTimeWindow
	DurationMinutes int
	Now             time.Time
	// TZOffset is the practitioner-local offset, e.g. "+07:00" or "Z".
	// Empty means WIB (+07:00).
	TZOffset string
}

// BusySlot is one occupied interval parsed from a Slot resource.
// Exported so the handler can use batch-fetched busy slots with ComputeNextSlot.
type BusySlot struct {
	Start time.Time
	End   time.Time
}

// NextFreeSlot returns the earliest bookable interval within the horizon,
// computed from PractitionerRole.availableTime windows minus explicit busy
// slots fetched from the FHIR backend. Returns a nil slot when nothing is
// available (nullable result).
func NextFreeSlot(ctx context.Context, params NextFreeSlotParams) (*TimeSlot, error) {
	client := params.Client
	if client == nil {
		client = http.DefaultClient
	}
	baseURL := strings.TrimRight(params.BackendBaseURL, "/")
	offset := parseTZOffset(params.TZOffset)
	dur := params.DurationMinutes
	if dur <= 0 {
		dur = defaultDurationMinutes
	}

	busy, err := fetchBusySlots(ctx, client, baseURL, params.ScheduleID, params.Now)
	if err != nil {
		return nil, err
	}
	return computeNextSlot(params.Windows, busy, params.Now, offset, dur), nil
}

// fetchBusySlots queries busy Slot resources for a schedule within the horizon.
func fetchBusySlots(ctx context.Context, client *http.Client, baseURL, scheduleID string, now time.Time) ([]BusySlot, error) {
	startISO := now.UTC().Format(time.RFC3339)
	endISO := now.AddDate(0, 0, availabilityHorizonDays).UTC().Format(time.RFC3339)
	path := "/fhir/Slot?schedule=" + url.QueryEscape(scheduleID) +
		"&status=" + busyStatusQuery +
		"&start=ge" + startISO +
		"&start=le" + endISO

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, baseURL+path, http.NoBody)
	if err != nil {
		return nil, fmt.Errorf("build busy slot request: %w", err)
	}
	req.Header.Set("Accept", "application/fhir+json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch busy slots: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("FHIR backend returned %d for Slot search", resp.StatusCode)
	}

	var bundle struct {
		Entry []struct {
			Resource struct {
				Start string `json:"start"`
				End   string `json:"end"`
			} `json:"resource"`
		} `json:"entry"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&bundle); err != nil {
		return nil, fmt.Errorf("decode Slot bundle: %w", err)
	}

	var out []BusySlot
	for _, e := range bundle.Entry {
		start, errStart := time.Parse(time.RFC3339, e.Resource.Start)
		end, errEnd := time.Parse(time.RFC3339, e.Resource.End)
		if errStart != nil || errEnd != nil {
			continue
		}
		out = append(out, BusySlot{Start: start, End: end})
	}
	return out, nil
}

// computeNextSlot scans the daily windows within the horizon for a free slot.
func computeNextSlot(windows []AvailableTimeWindow, busy []BusySlot, now time.Time, offset time.Duration, dur int) *TimeSlot {
	localNow := now.UTC().Add(offset)
	for i := 0; i < availabilityHorizonDays; i++ {
		day := localNow.AddDate(0, 0, i)
		dayName := fhirWeekday(day.Weekday())
		for _, w := range windows {
			if slot, ok := nextInWindow(w, day, dayName, busy, now, offset, dur); ok {
				return slot
			}
		}
	}
	return nil
}

// nextInWindow returns the first free interval inside one availableTime window.
func nextInWindow(w AvailableTimeWindow, day time.Time, dayName string, busy []BusySlot, now time.Time, offset time.Duration, dur int) (*TimeSlot, bool) {
	if !hasDay(w.DaysOfWeek, dayName) {
		return nil, false
	}
	startMin, okStart := parseHHMM(w.StartTime)
	endMin, okEnd := parseHHMM(w.EndTime)
	if !okStart || !okEnd || endMin <= startMin {
		return nil, false
	}
	for cursor := startMin; cursor+dur <= endMin; cursor += dur {
		slot := TimeSlot{
			Start: localInstant(day, cursor, offset).Format(time.RFC3339),
			End:   localInstant(day, cursor+dur, offset).Format(time.RFC3339),
		}
		if slotAvailable(slot, now, busy) {
			return &slot, true
		}
	}
	return nil, false
}

// slotAvailable reports whether the interval is in the future and conflict-free.
func slotAvailable(slot TimeSlot, now time.Time, busy []BusySlot) bool {
	start, errStart := time.Parse(time.RFC3339, slot.Start)
	end, errEnd := time.Parse(time.RFC3339, slot.End)
	if errStart != nil || errEnd != nil || !end.After(now) {
		return false
	}
	for _, b := range busy {
		if start.Before(b.End) && b.Start.Before(end) {
			return false
		}
	}
	return true
}

// localInstant converts a local day + minutes-from-midnight to a UTC instant.
func localInstant(day time.Time, minutes int, offset time.Duration) time.Time {
	local := time.Date(day.Year(), day.Month(), day.Day(), minutes/60, minutes%60, 0, 0, time.UTC)
	return local.Add(-offset)
}

// fhirWeekday maps time.Weekday to its FHIR three-letter code.
func fhirWeekday(day time.Weekday) string {
	return [...]string{"sun", "mon", "tue", "wed", "thu", "fri", "sat"}[day]
}

// hasDay reports whether the window's daysOfWeek contains the given code.
func hasDay(days []string, target string) bool {
	for _, d := range days {
		if d == target {
			return true
		}
	}
	return false
}

// parseHHMM converts "HH:mm[:ss]" to minutes-from-midnight.
func parseHHMM(value string) (int, bool) {
	parts := strings.Split(value, ":")
	if len(parts) == 3 && parts[2] == "00" {
		parts = parts[:2]
	}
	if len(parts) != 2 {
		return 0, false
	}
	hours, errH := strconv.Atoi(parts[0])
	minutes, errM := strconv.Atoi(parts[1])
	if errH != nil || errM != nil || hours < 0 || hours > 23 || minutes < 0 || minutes > 59 {
		return 0, false
	}
	return hours*60 + minutes, true
}

// parseTZOffset converts a "+07:00" / "-05:30" / "Z" offset to a duration.
// Empty or "Z" values resolve to UTC; empty falls back to the WIB default.
func parseTZOffset(tz string) time.Duration {
	tz = strings.TrimSpace(tz)
	if tz == "" {
		tz = defaultTZOffset
	}
	if tz == "Z" {
		return 0
	}
	sign := 1
	if strings.HasPrefix(tz, "-") {
		sign = -1
	}
	body := strings.TrimPrefix(strings.TrimPrefix(tz, "+"), "-")
	parts := strings.Split(body, ":")
	if len(parts) != 2 {
		return 0
	}
	hours, errH := strconv.Atoi(parts[0])
	minutes, errM := strconv.Atoi(parts[1])
	if errH != nil || errM != nil {
		return 0
	}
	return time.Duration(sign) * (time.Duration(hours)*time.Hour + time.Duration(minutes)*time.Minute)
}

// BusySlotPath returns the FHIR search URL for busy slots on a schedule.
// Extracted so the handler can collect paths for batch fetching.
func BusySlotPath(scheduleID string, now time.Time) string {
	startISO := now.UTC().Format(time.RFC3339)
	endISO := now.AddDate(0, 0, availabilityHorizonDays).UTC().Format(time.RFC3339)
	return "/fhir/Slot?schedule=" + url.QueryEscape(scheduleID) +
		"&status=" + busyStatusQuery +
		"&start=ge" + startISO +
		"&start=le" + endISO
}

// ParseBusySlotsBundle decodes one FHIR batch entry response into busy
// intervals. Pure function — no HTTP, no side effects.
func ParseBusySlotsBundle(data json.RawMessage) ([]BusySlot, error) {
	var bundle struct {
		Entry []struct {
			Resource struct {
				Start string `json:"start"`
				End   string `json:"end"`
			} `json:"resource"`
		} `json:"entry"`
	}
	if err := json.Unmarshal(data, &bundle); err != nil {
		return nil, fmt.Errorf("decode busy slot bundle: %w", err)
	}
	var out []BusySlot
	for _, e := range bundle.Entry {
		start, errStart := time.Parse(time.RFC3339, e.Resource.Start)
		end, errEnd := time.Parse(time.RFC3339, e.Resource.End)
		if errStart != nil || errEnd != nil {
			continue
		}
		out = append(out, BusySlot{Start: start, End: end})
	}
	return out, nil
}

// ParseTZOffset converts a "+07:00" / "-05:30" / "Z" offset string to a
// duration. Exported so the handler can compute the default offset.
func ParseTZOffset(tz string) time.Duration {
	return parseTZOffset(tz)
}

// ComputeNextSlot is the exported pure-function wrapper over computeNextSlot.
// The handler calls this with batch-fetched busy slots after fetchBusySlots
// is no longer needed.
func ComputeNextSlot(windows []AvailableTimeWindow, busy []BusySlot, now time.Time, offset time.Duration, dur int) *TimeSlot {
	return computeNextSlot(windows, busy, now, offset, dur)
}
