package handler

import "testing"

// assertBundleEntry validates a single entry's request method and URL.
func assertBundleEntry(t *testing.T, entry any, expectedMethod, expectedURL string) {
	t.Helper()
	em, ok := entry.(map[string]any)
	if !ok {
		t.Fatal("expected entry map")
		return
	}
	req, ok := em["request"].(map[string]any)
	if !ok {
		t.Fatal("expected request map")
		return
	}
	if req["method"] != expectedMethod || req["url"] != expectedURL {
		t.Errorf("expected %s %s, got %v %v", expectedMethod, expectedURL, req["method"], req["url"])
	}
}

// assertAppointmentResource validates the proposed Appointment entry in a transaction bundle.
func assertAppointmentResource(t *testing.T, entry any) {
	t.Helper()
	apptResource, ok := entry.(map[string]any)["resource"].(map[string]any)
	if !ok {
		t.Fatal("expected appointment resource map")
		return
	}
	if apptResource["status"] != "proposed" {
		t.Errorf("expected Appointment status=proposed, got %v", apptResource["status"])
	}
	if apptResource["start"] == "" || apptResource["end"] == "" {
		t.Errorf("expected Appointment start/end to be set")
	}
	if _, hasType := apptResource["appointmentType"]; hasType {
		t.Errorf("expected no appointmentType on proposed Appointment")
	}
	assertAppointmentSlotRef(t, apptResource)
	assertAppointmentParticipants(t, apptResource)
}

// assertAppointmentSlotRef validates the slot urn:uuid reference on the resource.
func assertAppointmentSlotRef(t *testing.T, apptResource map[string]any) {
	t.Helper()
	slotRefs, ok := apptResource["slot"].([]any)
	if !ok {
		t.Fatal("expected appointment slot reference")
		return
	}
	if len(slotRefs) < 1 {
		t.Fatal("expected at least one appointment slot reference")
		return
	}
	slotRef, ok := slotRefs[0].(map[string]any)
	if !ok || slotRef["reference"] != "urn:uuid:slot-1" {
		t.Errorf("expected Appointment slot reference=urn:uuid:slot-1, got %v", slotRef["reference"])
	}
}

// assertAppointmentParticipants validates the four needs-action participant actors.
func assertAppointmentParticipants(t *testing.T, apptResource map[string]any) {
	t.Helper()
	participants, ok := apptResource["participant"].([]any)
	if !ok {
		t.Fatal("expected appointment participants")
		return
	}
	if len(participants) != 4 {
		t.Fatalf("expected 4 participants, got %d", len(participants))
	}
	actors := map[string]bool{}
	for _, p := range participants {
		pm, ok := p.(map[string]any)
		if !ok {
			t.Fatal("expected participant map")
			return
		}
		if pm["status"] != "needs-action" {
			t.Errorf("expected participant status=needs-action, got %v", pm["status"])
		}
		actor, ok := pm["actor"].(map[string]any)
		if !ok {
			t.Fatal("expected participant actor")
			return
		}
		reference, ok := actor["reference"].(string)
		if !ok {
			t.Fatal("expected participant actor reference")
			return
		}
		actors[reference] = true
	}
	for _, expected := range []string{
		"Patient/pat-1",
		"Practitioner/prac-1",
		"PractitionerRole/pr-123",
		"HealthcareService/hs-456",
	} {
		if !actors[expected] {
			t.Errorf("expected participant actor %s", expected)
		}
	}
}

// assertSlotResource validates the Slot entry in a transaction bundle.
func assertSlotResource(t *testing.T, entry any) {
	t.Helper()
	if fullURL, _ := entry.(map[string]any)["fullUrl"].(string); fullURL != "urn:uuid:slot-1" {
		t.Errorf("expected Slot fullUrl=urn:uuid:slot-1, got %v", fullURL)
	}
	slotResource, ok := entry.(map[string]any)["resource"].(map[string]any)
	if !ok {
		t.Fatal("expected slot resource map")
		return
	}
	if slotResource["status"] != "free" {
		t.Errorf("expected Slot status=free, got %v", slotResource["status"])
	}
	sched, ok := slotResource["schedule"].(map[string]any)
	if !ok {
		t.Fatal("expected schedule map")
		return
	}
	if sched["reference"] != "Schedule/sched-1" {
		t.Errorf("expected Slot schedule=Schedule/sched-1")
	}
}

// assertInvoiceResource validates the Invoice entry in a transaction bundle.
func assertInvoiceResource(t *testing.T, entry any) {
	t.Helper()
	invoiceResource, ok := entry.(map[string]any)["resource"].(map[string]any)
	if !ok {
		t.Fatal("expected invoice resource map")
		return
	}
	if invoiceResource["status"] != "issued" {
		t.Errorf("expected Invoice status=issued, got %v", invoiceResource["status"])
	}
	totalNet, ok := invoiceResource["totalNet"].(map[string]any)
	if !ok {
		t.Fatal("expected totalNet map")
		return
	}
	if totalNet["value"] != float64(150000) {
		t.Errorf("expected Invoice.totalNet.value=150000, got %v", totalNet["value"])
	}
	if totalNet["currency"] != "IDR" {
		t.Errorf("expected Invoice.totalNet.currency=IDR, got %v", totalNet["currency"])
	}
	subject, ok := invoiceResource["subject"].(map[string]any)
	if !ok {
		t.Fatal("expected subject map")
		return
	}
	if subject["reference"] != "Patient/pat-1" {
		t.Errorf("expected Invoice subject=Patient/pat-1")
	}
}

// assertBundleEntries validates the FHIR transaction bundle structure and values.
func assertBundleEntries(t *testing.T, capturedBundle map[string]any) {
	t.Helper()

	if capturedBundle["resourceType"] != "Bundle" {
		t.Errorf("expected Bundle, got %v", capturedBundle["resourceType"])
	}
	if capturedBundle["type"] != "transaction" {
		t.Errorf("expected transaction, got %v", capturedBundle["type"])
	}

	entries, ok := capturedBundle["entry"].([]any)
	if !ok {
		t.Fatal("expected entry array")
	}
	if len(entries) != 3 {
		t.Fatalf("expected 3 entries, got %d", len(entries))
	}

	assertBundleEntry(t, entries[0], "POST", "Slot")
	assertBundleEntry(t, entries[1], "POST", "Invoice")
	assertBundleEntry(t, entries[2], "POST", "Appointment")
	assertSlotResource(t, entries[0])
	assertInvoiceResource(t, entries[1])
	assertAppointmentResource(t, entries[2])
}

