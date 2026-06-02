package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/konsulin-care/konsulin-app/internal/fhir"
)

type ctxKey string

const (
	CtxAuthToken ctxKey = "authToken"
	CtxSelfURL   ctxKey = "selfURL"
)

func WithAuthToken(ctx context.Context, token string) context.Context {
	return context.WithValue(ctx, CtxAuthToken, token)
}

func WithSelfURL(ctx context.Context, selfURL string) context.Context {
	return context.WithValue(ctx, CtxSelfURL, selfURL)
}

type FHIRProvider struct {
	*StubProvider
	client *fhir.Client
}

func NewFHIRProvider(client *fhir.Client) *FHIRProvider {
	return &FHIRProvider{
		StubProvider: NewStubProvider(),
		client:       client,
	}
}

func (p *FHIRProvider) GetPopularAssessments(ctx context.Context) ([]AssessmentCard, error) {
	bundle, err := p.client.SearchQuestionnaires()
	if err != nil {
		return nil, fmt.Errorf("search questionnaires: %w", err)
	}
	if bundle == nil || len(bundle.Entry) == 0 {
		return []AssessmentCard{}, nil
	}

	cards := make([]AssessmentCard, 0, len(bundle.Entry))
	for _, entry := range bundle.Entry {
		var q fhir.Questionnaire
		if err := json.Unmarshal(entry.Resource, &q); err != nil {
			continue
		}
		if q.ID == "" {
			continue
		}
		cards = append(cards, AssessmentCard{
			ID:          q.ID,
			Title:       q.Title,
			Description: q.Description,
		})
	}
	return cards, nil
}

type resourceRef struct {
	resourceType string
	id           string
}

func parseResourceRef(raw json.RawMessage) resourceRef {
	var ref struct {
		ResourceType string `json:"resourceType"`
		ID           string `json:"id,omitempty"`
	}
	if err := json.Unmarshal(raw, &ref); err != nil {
		return resourceRef{}
	}
	return resourceRef{resourceType: ref.ResourceType, id: ref.ID}
}

func mergeHumanName(names []fhir.HumanName) string {
	if len(names) == 0 {
		return "-"
	}
	parts := append(names[0].Given, names[0].Family)
	var filtered []string
	for _, p := range parts {
		if p != "" {
			filtered = append(filtered, p)
		}
	}
	if len(filtered) == 0 {
		return "-"
	}
	return strings.Join(filtered, " ")
}

func getTodayUTCStart() string {
	y, m, d := time.Now().Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC).Format(time.RFC3339)
}

func (p *FHIRProvider) fetchBundleViaProxy(ctx context.Context, proxyURL string) (*fhir.Bundle, error) {
	selfURL, ok := ctx.Value(CtxSelfURL).(string)
	if !ok || selfURL == "" {
		return nil, fmt.Errorf("selfURL not set in context")
	}
	authToken, _ := ctx.Value(CtxAuthToken).(string)

	u, err := url.JoinPath(selfURL, proxyURL)
	if err != nil {
		return nil, fmt.Errorf("build proxy URL: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, http.NoBody)
	if err != nil {
		return nil, fmt.Errorf("create proxy request: %w", err)
	}
	if authToken != "" {
		req.Header.Set("Authorization", "Bearer "+authToken)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("proxy request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return nil, fmt.Errorf("proxy returned %d: %s", resp.StatusCode, bytes.TrimSpace(body))
	}

	var bundle fhir.Bundle
	if err := json.NewDecoder(resp.Body).Decode(&bundle); err != nil {
		return nil, fmt.Errorf("decode proxy bundle: %w", err)
	}
	if bundle.ResourceType != "Bundle" {
		return nil, fmt.Errorf("proxy response is not a Bundle, got %s", bundle.ResourceType)
	}
	return &bundle, nil
}

func (p *FHIRProvider) GetUpcomingSession(ctx context.Context, role, fhirID string) (*UpcomingSessionData, error) {
	if fhirID == "" {
		return nil, nil
	}

	actorType := "Patient"
	if role == "Practitioner" {
		actorType = "Practitioner"
	}

	todayUTC := getTodayUTCStart()

	proxyPath := fmt.Sprintf(
		"/proxy/fhir/Appointment?actor=%s/%s&slot.start=ge%s&_include=Appointment:slot",
		actorType, fhirID, url.QueryEscape(todayUTC),
	)
	if actorType == "Patient" {
		proxyPath += "&_include=Appointment:actor:PractitionerRole&_include:iterate=PractitionerRole:practitioner"
	} else {
		proxyPath += "&_include=Appointment:actor:Patient"
	}

	bundle, err := p.fetchBundleViaProxy(ctx, proxyPath)
	if err != nil {
		return nil, fmt.Errorf("fetch via proxy: %w", err)
	}
	if bundle == nil || len(bundle.Entry) == 0 {
		return nil, nil
	}

	appointments := parseAppointmentsFromBundle(bundle, actorType)
	if len(appointments) == 0 {
		return nil, nil
	}

	sort.Slice(appointments, func(i, j int) bool {
		return appointments[i].slotStart.Before(appointments[j].slotStart)
	})
	next := appointments[0]

	return &UpcomingSessionData{
		DisplayName: findActorName(bundle, next.actorID),
		Time:        next.slotStart.Format("15:04"),
		Date:        next.slotStart.Format("02/01/2006"),
	}, nil
}

type apptInfo struct{ appointmentID string; slotID string; actorID string; slotStart time.Time }

func parseAppointmentsFromBundle(bundle *fhir.Bundle, actorType string) []apptInfo {
	slotByID := make(map[string]fhir.Slot)
	for _, entry := range bundle.Entry {
		ref := parseResourceRef(entry.Resource)
		if ref.resourceType != "Slot" {
			continue
		}
		var s fhir.Slot
		if err := json.Unmarshal(entry.Resource, &s); err == nil {
			slotByID[s.ID] = s
		}
	}

	var appointments []apptInfo
	for _, entry := range bundle.Entry {
		appt, ok := parseAppointmentEntry(entry, slotByID, actorType)
		if ok {
			appointments = append(appointments, appt)
		}
	}
	return appointments
}
func parseAppointmentEntry(entry fhir.BundleEntry, slotByID map[string]fhir.Slot, actorType string) (apptInfo, bool) {
	var a struct {
		ResourceType string                       `json:"resourceType"`
		ID           string                       `json:"id,omitempty"`
		Participant  []fhir.AppointmentParticipant `json:"participant,omitempty"`
		Slot         []fhir.CodeableReference      `json:"slot,omitempty"`
	}
	if err := json.Unmarshal(entry.Resource, &a); err != nil {
		return apptInfo{}, false
	}
	if a.ResourceType != "Appointment" || a.ID == "" {
		return apptInfo{}, false
	}
	slotID := extractSlotID(a.Slot)
	if slotID == "" {
		return apptInfo{}, false
	}
	slot, ok := slotByID[slotID]
	if !ok || slot.Start == "" {
		return apptInfo{}, false
	}
	slotTime, err := time.Parse(time.RFC3339, slot.Start)
	if err != nil {
		return apptInfo{}, false
	}
	actorID := extractActorID(a.Participant, actorType)
	if actorID == "" {
		return apptInfo{}, false
	}
	return apptInfo{appointmentID: a.ID, slotID: slotID, actorID: actorID, slotStart: slotTime}, true
}
func extractSlotID(slots []fhir.CodeableReference) string {
	for _, s := range slots {
		if s.Reference != "" {
			parts := strings.Split(s.Reference, "/")
			return parts[len(parts)-1]
		}
	}
	return ""
}
func extractActorID(participants []fhir.AppointmentParticipant, actorType string) string {
	prefix := "Practitioner/"
	if actorType == "Practitioner" {
		prefix = "Patient/"
	}
	for _, p := range participants {
		if p.Actor != nil && strings.HasPrefix(p.Actor.Reference, prefix) {
			parts := strings.Split(p.Actor.Reference, "/")
			return parts[len(parts)-1]
		}
	}
	return ""
}
func findActorName(bundle *fhir.Bundle, actorID string) string {
	for _, entry := range bundle.Entry {
		ref := parseResourceRef(entry.Resource)
		if ref.id != actorID {
			continue
		}
		var name string
		switch ref.resourceType {
		case "Practitioner":
			var p fhir.Practitioner
			if err := json.Unmarshal(entry.Resource, &p); err == nil {
				name = mergeHumanName(p.Name)
			}
		case "Patient":
			var pt fhir.Patient
			if err := json.Unmarshal(entry.Resource, &pt); err == nil {
				name = mergeHumanName(pt.Name)
			}
		}
		if name != "" {
			return name
		}
	}
	return "-"
}
