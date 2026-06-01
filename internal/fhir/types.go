// Package fhir provides FHIR R4 resource types and an HTTP client for the backend FHIR API.
package fhir

import "encoding/json"

type Bundle struct {
	ResourceType string           `json:"resourceType"`
	ID           string           `json:"id,omitempty"`
	Type         string           `json:"type"`
	Total        *int             `json:"total,omitempty"`
	Entry        []BundleEntry    `json:"entry,omitempty"`
	Link         []BundleLink     `json:"link,omitempty"`
}

type BundleEntry struct {
	FullURL  string           `json:"fullUrl,omitempty"`
	Resource json.RawMessage  `json:"resource,omitempty"`
}

type BundleLink struct {
	Relation string `json:"relation"`
	URL      string `json:"url"`
}

type CodeableReference struct {
	Reference      string                 `json:"reference,omitempty"`
	Display       string                 `json:"display,omitempty"`
	Identifier    *Identifier            `json:"identifier,omitempty"`
}

type Identifier struct {
	System string `json:"system,omitempty"`
	Value  string `json:"value,omitempty"`
}

type HumanName struct {
	Use    string   `json:"use,omitempty"`
	Text   string   `json:"text,omitempty"`
	Family string   `json:"family,omitempty"`
	Given  []string `json:"given,omitempty"`
}

type ContactPoint struct {
	System string `json:"system,omitempty"`
	Value  string `json:"value,omitempty"`
	Use    string `json:"use,omitempty"`
}

type Period struct {
	Start string `json:"start,omitempty"`
	End   string `json:"end,omitempty"`
}

type PractitionerRole struct {
	ResourceType       string           `json:"resourceType"`
	ID                 string           `json:"id,omitempty"`
	Practitioner       *CodeableReference `json:"practitioner,omitempty"`
	Organization       *CodeableReference `json:"organization,omitempty"`
	HealthcareService  []CodeableReference `json:"healthcareService,omitempty"`
	Specialty          []CodeableConcept  `json:"specialty,omitempty"`
	AvailableTime      []Availability    `json:"availableTime,omitempty"`
	NotAvailable       []NotAvailable    `json:"notAvailable,omitempty"`
	AvailabilityExceptions string       `json:"availabilityExceptions,omitempty"`
}

type CodeableConcept struct {
	Coding []Coding `json:"coding,omitempty"`
	Text   string   `json:"text,omitempty"`
}

type Coding struct {
	System  string `json:"system,omitempty"`
	Code    string `json:"code,omitempty"`
	Display string `json:"display,omitempty"`
}

type Availability struct {
	DaysOfWeek []string `json:"daysOfWeek,omitempty"`
	AllDay     *bool    `json:"allDay,omitempty"`
	AvailableStartTime string `json:"availableStartTime,omitempty"`
	AvailableEndTime   string `json:"availableEndTime,omitempty"`
}

type NotAvailable struct {
	Description string `json:"description"`
	During      *Period `json:"during,omitempty"`
}

type HealthcareService struct {
	ResourceType    string             `json:"resourceType"`
	ID              string             `json:"id,omitempty"`
	ProvidedBy      *CodeableReference `json:"providedBy,omitempty"`
	Category        []CodeableConcept  `json:"category,omitempty"`
	Specialty       []CodeableConcept  `json:"specialty,omitempty"`
	Name            string             `json:"name,omitempty"`
	Description     string             `json:"description,omitempty"`
	AppointmentRequired *bool          `json:"appointmentRequired,omitempty"`
}

type Slot struct {
	ResourceType string `json:"resourceType"`
	ID           string `json:"id,omitempty"`
	Schedule     *CodeableReference `json:"schedule,omitempty"`
	Status       string `json:"status"`
	Start        string `json:"start"`
	End          string `json:"end"`
}

type Appointment struct {
	ResourceType string              `json:"resourceType"`
	ID           string              `json:"id,omitempty"`
	Status       string              `json:"status"`
	Start        string              `json:"start,omitempty"`
	End          string              `json:"end,omitempty"`
	MinutesDuration int              `json:"minutesDuration,omitempty"`
	ServiceType []CodeableConcept    `json:"serviceType,omitempty"`
	Participant []AppointmentParticipant `json:"participant,omitempty"`
	Description string              `json:"description,omitempty"`
}

type AppointmentParticipant struct {
	Type      []CodeableConcept    `json:"type,omitempty"`
	Actor     *CodeableReference   `json:"actor,omitempty"`
	Status    string               `json:"status"`
}

type Patient struct {
	ResourceType string      `json:"resourceType"`
	ID           string      `json:"id,omitempty"`
	Name         []HumanName `json:"name,omitempty"`
	BirthDate    string      `json:"birthDate,omitempty"`
	Telecom      []ContactPoint `json:"telecom,omitempty"`
}

type Practitioner struct {
	ResourceType  string          `json:"resourceType"`
	ID            string          `json:"id,omitempty"`
	Name          []HumanName     `json:"name,omitempty"`
	Qualification []Qualification `json:"qualification,omitempty"`
	Telecom       []ContactPoint  `json:"telecom,omitempty"`
	Photo         []Attachment    `json:"photo,omitempty"`
}

type Qualification struct {
	Code      CodeableConcept   `json:"code,omitempty"`
	Issuer    *CodeableReference `json:"issuer,omitempty"`
}

type Attachment struct {
	ContentType string `json:"contentType,omitempty"`
	URL         string `json:"url,omitempty"`
	Title       string `json:"title,omitempty"`
}

type Questionnaire struct {
	ResourceType string            `json:"resourceType"`
	ID           string            `json:"id,omitempty"`
	Title        string            `json:"title,omitempty"`
	Description  string            `json:"description,omitempty"`
	Status       string            `json:"status"`
	Item         []QuestionnaireItem `json:"item,omitempty"`
}

type QuestionnaireItem struct {
	LinkID     string               `json:"linkId"`
	Text       string               `json:"text,omitempty"`
	Type       string               `json:"type"`
	Required   *bool                `json:"required,omitempty"`
	Item       []QuestionnaireItem  `json:"item,omitempty"`
}
