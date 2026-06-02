// Package service provides business logic and data aggregation for Go SSR handlers.
package service

import (
	"context"
	"fmt"
	"time"
)

type HomeData struct {
	DisplayName string
	IsGuest     bool
	FHIRID      string
	Role        string

	Recommendations    []RecommendationCard
	QuickActions       []QuickAction
	PopularAssessments []AssessmentCard

	TodaySchedule []AppointmentSummary
	PatientList   []PatientSummary
	Stats         *PractitionerStats
	Instruments   []AssessmentCard
	ExerciseLink  QuickAction
	SOAPLink      QuickAction

	PractitionerCount int
	PendingApprovals  int
	Clinics           []ClinicContext

	UpcomingSession *UpcomingSessionData
}

type RecommendationCard struct {
	Specialty     string
	Practitioner  string
	Fee           string
	NextAvailable string
	ImageURL      string
	IsBookable    bool
}

type QuickAction struct {
	Title       string
	Href        string
	Icon        string
	Description string
}

type AssessmentCard struct {
	ID          string
	Title       string
	Description string
}

type AppointmentSummary struct {
	Time    string
	Patient string
	Status  string
}

type PatientSummary struct {
	ID   string
	Name string
}

type PractitionerStats struct {
	SessionsToday int
	PatientsToday int
}

type ClinicContext struct {
	ID   string
	Name string
}

type UpcomingSessionData struct {
	DisplayName string
	Time        string
	Date        string
}

type HomeService struct {
	provider DataProvider
}

type DataProvider interface {
	GetRecommendations(ctx context.Context) ([]RecommendationCard, error)
	GetTodaySchedule(ctx context.Context, practitionerID string) ([]AppointmentSummary, error)
	GetUpcomingSession(ctx context.Context, role, fhirID string) (*UpcomingSessionData, error)
	GetPopularAssessments(ctx context.Context) ([]AssessmentCard, error)
	GetInstruments(ctx context.Context) ([]AssessmentCard, error)
	GetPatientList(ctx context.Context, practitionerID string) ([]PatientSummary, error)
	GetPractitionerStats(ctx context.Context, practitionerID string) (*PractitionerStats, error)
	GetAdminOverview(ctx context.Context, clinicID string) (int, int, []ClinicContext, error)
}

func NewHomeService(p DataProvider) *HomeService {
	return &HomeService{provider: p}
}

func (s *HomeService) FetchHomeData(ctx context.Context, role, fhirID, displayName string) (*HomeData, error) {
	data := &HomeData{
		DisplayName: displayName,
		IsGuest:     role == "Guest",
		FHIRID:      fhirID,
		Role:        role,
	}

	switch role {
	case "Practitioner":
		if err := s.populatePractitioner(ctx, data, fhirID); err != nil {
			return data, err
		}
	case "Clinic Admin":
		if err := s.populateAdmin(ctx, data, fhirID); err != nil {
			return data, err
		}
	default:
		if err := s.populatePatient(ctx, data); err != nil {
			return data, err
		}
	}

	// Upcoming session is server-side rendered to avoid client-side fetch
	// inconsistency (Alpine.js race with session initialization).
	session, err := s.provider.GetUpcomingSession(ctx, role, fhirID)
	if err == nil {
		data.UpcomingSession = session
	}

	return data, nil
}

func (s *HomeService) populatePatient(ctx context.Context, data *HomeData) error {
	recs, err := s.provider.GetRecommendations(ctx)
	if err != nil {
		return fmt.Errorf("get recommendations: %w", err)
	}
	data.Recommendations = recs

	data.QuickActions = []QuickAction{
		{Title: "Journal", Href: "/journal", Icon: "/static/images/writing.svg", Description: "Express your current feelings"},
		{Title: "Assessment", Href: "/assessments", Icon: "/static/images/mental-health.svg", Description: "Check your mental well-being"},
	}
	data.PopularAssessments, _ = s.provider.GetPopularAssessments(ctx)
	return nil
}

func (s *HomeService) populatePractitioner(ctx context.Context, data *HomeData, fhirID string) error {
	schedule, err := s.provider.GetTodaySchedule(ctx, fhirID)
	if err != nil {
		return fmt.Errorf("get today schedule: %w", err)
	}
	data.TodaySchedule = schedule

	data.QuickActions = []QuickAction{
		{Title: "Journal", Href: "/journal", Icon: "/static/images/writing.svg", Description: "Express your current feelings"},
		{Title: "Assessment", Href: "/assessments", Icon: "/static/images/mental-health.svg", Description: "Check your mental well-being"},
	}
	data.ExerciseLink = QuickAction{Title: "Health Exercise Resources", Href: "/exercise"}
	data.SOAPLink = QuickAction{Title: "SOAP Report", Href: "/assessments/soap"}
	data.Instruments, _ = s.provider.GetInstruments(ctx)

	patients, _ := s.provider.GetPatientList(ctx, fhirID)
	data.PatientList = patients

	stats, _ := s.provider.GetPractitionerStats(ctx, fhirID)
	data.Stats = stats

	return nil
}

func (s *HomeService) populateAdmin(ctx context.Context, data *HomeData, fhirID string) error {
	count, pending, clinics, err := s.provider.GetAdminOverview(ctx, fhirID)
	if err != nil {
		return fmt.Errorf("get admin overview: %w", err)
	}
	data.PractitionerCount = count
	data.PendingApprovals = pending
	data.Clinics = clinics
	return nil
}

type StubProvider struct{}

func NewStubProvider() *StubProvider {
	return &StubProvider{}
}

func (p *StubProvider) GetRecommendations(_ context.Context) ([]RecommendationCard, error) {
	return []RecommendationCard{
		{Specialty: "General Checkup", Practitioner: "Dr. Sarah", Fee: "Rp 150,000", NextAvailable: "Tomorrow, 10:00", IsBookable: true},
		{Specialty: "Dental Care", Practitioner: "Dr. Budi", Fee: "Rp 200,000", NextAvailable: "Wed, 14:00", IsBookable: true},
		{Specialty: "Eye Examination", Practitioner: "Dr. Ani", Fee: "Rp 180,000", NextAvailable: "Thu, 09:00", IsBookable: true},
	}, nil
}

func (p *StubProvider) GetTodaySchedule(_ context.Context, _ string) ([]AppointmentSummary, error) {
	now := time.Now()
	tomorrow := now.Add(24 * time.Hour)
	return []AppointmentSummary{
		{Time: tomorrow.Format("15:04"), Patient: "Patient A", Status: "Confirmed"},
		{Time: tomorrow.Add(1 * time.Hour).Format("15:04"), Patient: "Patient B", Status: "Pending"},
	}, nil
}

func (p *StubProvider) GetUpcomingSession(_ context.Context, _, _ string) (*UpcomingSessionData, error) {
	now := time.Now()
	tomorrow := now.Add(24 * time.Hour)
	return &UpcomingSessionData{
		DisplayName: "Dr. Sarah",
		Time:        tomorrow.Format("15:04"),
		Date:        tomorrow.Format("02/01/2006"),
	}, nil
}

func (p *StubProvider) GetPopularAssessments(_ context.Context) ([]AssessmentCard, error) {
	return []AssessmentCard{
		{ID: "1", Title: "PHQ-9", Description: "Depression screening"},
		{ID: "2", Title: "GAD-7", Description: "Anxiety screening"},
	}, nil
}

func (p *StubProvider) GetInstruments(_ context.Context) ([]AssessmentCard, error) {
	return []AssessmentCard{
		{ID: "3", Title: "WHO-5", Description: "Well-being index"},
		{ID: "4", Title: "PSQI", Description: "Sleep quality"},
	}, nil
}

func (p *StubProvider) GetPatientList(_ context.Context, _ string) ([]PatientSummary, error) {
	return []PatientSummary{
		{ID: "p1", Name: "Patient A"},
		{ID: "p2", Name: "Patient B"},
	}, nil
}

func (p *StubProvider) GetPractitionerStats(_ context.Context, _ string) (*PractitionerStats, error) {
	return &PractitionerStats{SessionsToday: 8, PatientsToday: 6}, nil
}

func (p *StubProvider) GetAdminOverview(_ context.Context, _ string) (int, int, []ClinicContext, error) {
	return 5, 2, []ClinicContext{
		{ID: "c1", Name: "Main Clinic"},
		{ID: "c2", Name: "Branch Clinic"},
	}, nil
}
