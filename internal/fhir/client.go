// Package fhir provides FHIR R4 resource types and an HTTP client for the backend FHIR API.
package fhir

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	searchPractitionerRole = "PractitionerRole"
	searchSlot             = "Slot"
	searchAppointment      = "Appointment"
	searchPatient          = "Patient"
	searchPractitioner     = "Practitioner"
)

type Client struct {
	baseURL    string
	httpClient *http.Client
}

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL:    strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *Client) SetHTTPClient(hc *http.Client) {
	c.httpClient = hc
}

func (c *Client) search(resourceType string, params url.Values) (*Bundle, error) {
	u := fmt.Sprintf("%s/%s?%s", c.baseURL, resourceType, params.Encode())
	req, err := http.NewRequest(http.MethodGet, u, http.NoBody)
	if err != nil {
		return nil, fmt.Errorf("fhir search %s: %w", resourceType, err)
	}
	req.Header.Set("Accept", "application/json")
	return c.do(req)
}

func (c *Client) read(resourceType, id string) (*Bundle, error) {
	u := fmt.Sprintf("%s/%s/%s", c.baseURL, resourceType, id)
	req, err := http.NewRequest(http.MethodGet, u, http.NoBody)
	if err != nil {
		return nil, fmt.Errorf("fhir read %s/%s: %w", resourceType, id, err)
	}
	req.Header.Set("Accept", "application/json")
	return c.do(req)
}

func (c *Client) do(req *http.Request) (*Bundle, error) {
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fhir request: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("fhir request %s: status %d: %s",
			req.URL.Redacted(), resp.StatusCode, string(body))
	}
	var bundle Bundle
	if err := json.NewDecoder(resp.Body).Decode(&bundle); err != nil {
		return nil, fmt.Errorf("fhir decode: %w", err)
	}
	if bundle.ResourceType != "Bundle" {
		return nil, fmt.Errorf("fhir: expected Bundle, got %s", bundle.ResourceType)
	}
	return &bundle, nil
}

func (c *Client) SearchPractitionerRoles(specialty string) (*Bundle, error) {
	params := url.Values{}
	if specialty != "" {
		params.Set("specialty", specialty)
	}
	params.Set("_count", "20")
	params.Set("_include", "PractitionerRole:practitioner")
	params.Set("_include", "PractitionerRole:healthcareservice")
	return c.search(searchPractitionerRole, params)
}

func (c *Client) SearchSlotsBySchedule(scheduleID string, startDate, endDate string) (*Bundle, error) {
	params := url.Values{}
	params.Set("schedule", scheduleID)
	if startDate != "" {
		params.Set("start", "ge"+startDate)
	}
	if endDate != "" {
		params.Set("start", "le"+endDate)
	}
	params.Set("_count", "50")
	return c.search(searchSlot, params)
}

func (c *Client) SearchAppointments(patientID, practitionerID, dateReference string) (*Bundle, error) {
	params := url.Values{}
	if patientID != "" {
		params.Set("patient", patientID)
	}
	if practitionerID != "" {
		params.Set("practitioner", practitionerID)
	}
	if dateReference != "" {
		params.Set("date", "ge"+dateReference)
	}
	params.Set("_count", "20")
	params.Set("_sort", "date")
	return c.search(searchAppointment, params)
}

func (c *Client) SearchUpcomingAppointments(patientID, dateReference string) (*Bundle, error) {
	return c.SearchAppointments(patientID, "", dateReference)
}

func (c *Client) SearchUpcomingSessions(practitionerID, dateReference string) (*Bundle, error) {
	return c.SearchAppointments("", practitionerID, dateReference)
}

func (c *Client) ReadPatient(id string) (*Bundle, error) {
	return c.read(searchPatient, id)
}

func (c *Client) ReadPractitioner(id string) (*Bundle, error) {
	return c.read(searchPractitioner, id)
}

func LogBundle(b *Bundle) {
	if b == nil {
		slog.Debug("fhir bundle is nil")
		return
	}
	slog.Debug("fhir bundle",
		"total", b.Total,
		"entries", len(b.Entry),
		"type", b.Type,
	)
}
