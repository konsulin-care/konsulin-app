package service

import (
	"context"
	"testing"
)

func TestStubProvider_GetRecommendations(t *testing.T) {
	p := NewStubProvider()
	recs, err := p.GetRecommendations(context.Background())
	if err != nil {
		t.Fatalf("GetRecommendations: %v", err)
	}
	if len(recs) == 0 {
		t.Fatal("expected at least one recommendation")
	}
	if recs[0].Specialty == "" {
		t.Error("expected non-empty Specialty")
	}
	if recs[0].Practitioner == "" {
		t.Error("expected non-empty Practitioner")
	}
	if !recs[0].IsBookable {
		t.Error("expected IsBookable true for stub")
	}
}

func TestStubProvider_GetTodaySchedule(t *testing.T) {
	p := NewStubProvider()
	schedule, err := p.GetTodaySchedule(context.Background(), "practitioner-1")
	if err != nil {
		t.Fatalf("GetTodaySchedule: %v", err)
	}
	if len(schedule) == 0 {
		t.Fatal("expected at least one schedule item")
	}
	if schedule[0].Time == "" {
		t.Error("expected non-empty Time")
	}
	if schedule[0].Patient == "" {
		t.Error("expected non-empty Patient")
	}
}

func TestStubProvider_GetPopularAssessments(t *testing.T) {
	p := NewStubProvider()
	assessments, err := p.GetPopularAssessments(context.Background())
	if err != nil {
		t.Fatalf("GetPopularAssessments: %v", err)
	}
	if len(assessments) == 0 {
		t.Fatal("expected at least one assessment")
	}
	if assessments[0].Title == "" {
		t.Error("expected non-empty Title")
	}
}

func TestStubProvider_GetAdminOverview(t *testing.T) {
	p := NewStubProvider()
	count, pending, clinics, err := p.GetAdminOverview(context.Background(), "admin-1")
	if err != nil {
		t.Fatalf("GetAdminOverview: %v", err)
	}
	if count == 0 {
		t.Error("expected non-zero practitioner count")
	}
	if len(clinics) == 0 {
		t.Error("expected at least one clinic")
	}
	if pending < 0 {
		t.Error("expected non-negative pending approvals")
	}
}

func TestHomeService_FetchHomeData_guest(t *testing.T) {
	svc := NewHomeService(NewStubProvider())
	data, err := svc.FetchHomeData(context.Background(), "Guest", "", "")
	if err != nil {
		t.Fatalf("FetchHomeData: %v", err)
	}
	if !data.IsGuest {
		t.Error("expected IsGuest true for Guest role")
	}
	if len(data.Recommendations) == 0 {
		t.Error("expected recommendations for guest")
	}
}

func TestHomeService_FetchHomeData_patient(t *testing.T) {
	svc := NewHomeService(NewStubProvider())
	data, err := svc.FetchHomeData(context.Background(), "Patient", "patient-1", "Alice")
	if err != nil {
		t.Fatalf("FetchHomeData: %v", err)
	}
	if data.IsGuest {
		t.Error("expected IsGuest false for Patient role")
	}
	if data.DisplayName != "Alice" {
		t.Errorf("expected DisplayName Alice, got %s", data.DisplayName)
	}
	if len(data.Recommendations) == 0 {
		t.Error("expected recommendations for patient")
	}
}

func TestHomeService_FetchHomeData_practitioner(t *testing.T) {
	svc := NewHomeService(NewStubProvider())
	data, err := svc.FetchHomeData(context.Background(), "Practitioner", "practitioner-1", "Dr. Bob")
	if err != nil {
		t.Fatalf("FetchHomeData: %v", err)
	}
	if len(data.TodaySchedule) == 0 {
		t.Error("expected today schedule for practitioner")
	}
	if data.Stats == nil {
		t.Error("expected stats for practitioner")
	}
	if data.SOAPLink.Href == "" {
		t.Error("expected SOAP link for practitioner")
	}
	if len(data.Instruments) == 0 {
		t.Error("expected instruments for practitioner")
	}
}

func TestHomeService_FetchHomeData_admin(t *testing.T) {
	svc := NewHomeService(NewStubProvider())
	data, err := svc.FetchHomeData(context.Background(), "Clinic Admin", "admin-1", "Admin")
	if err != nil {
		t.Fatalf("FetchHomeData: %v", err)
	}
	if data.PractitionerCount == 0 {
		t.Error("expected non-zero practitioner count")
	}
	if len(data.Clinics) == 0 {
		t.Error("expected at least one clinic for admin")
	}
}
