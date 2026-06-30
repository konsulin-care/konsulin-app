package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func lookupOK(t *testing.T, id string) map[string]any {
	t.Helper()
	r := newWilayahTestRouter(t)
	req := httptest.NewRequest(http.MethodGet, "/api/lookup/"+id, http.NoBody)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("lookup %s expected 200, got %d", id, rec.Code)
	}
	var result map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &result); err != nil {
		t.Fatalf("failed to decode lookup: %v", err)
	}
	return result
}

func TestLookupHandler_Province(t *testing.T) {
	result := lookupOK(t, "11")
	if result["id"] != "11" {
		t.Errorf("expected id '11', got %v", result["id"])
	}
	if result["name"] != "ACEH" {
		t.Errorf("expected name 'ACEH', got %v", result["name"])
	}
	if result["level"] != "province" {
		t.Errorf("expected level 'province', got %v", result["level"])
	}
	parents, ok := result["parents"].([]any)
	if !ok || len(parents) != 0 {
		t.Errorf("expected empty parents, got %v", result["parents"])
	}
}

func TestLookupHandler_Regency(t *testing.T) {
	result := lookupOK(t, "3204")
	if result["id"] != "3204" {
		t.Errorf("expected id '3204', got %v", result["id"])
	}
	if result["name"] != "KABUPATEN BANDUNG" {
		t.Errorf("expected name 'KABUPATEN BANDUNG', got %v", result["name"])
	}
	if result["level"] != "regency" {
		t.Errorf("expected level 'regency', got %v", result["level"])
	}
	parents, ok := result["parents"].([]any)
	if !ok || len(parents) != 1 {
		t.Fatalf("expected 1 parent, got %d", len(parents))
	}
	parent := parents[0].(map[string]any)
	if parent["id"] != "32" || parent["name"] != "JAWA BARAT" || parent["level"] != "province" {
		t.Errorf("parent mismatch: %v", parent)
	}
}

func TestLookupHandler_District(t *testing.T) {
	result := lookupOK(t, "3204050")
	if result["id"] != "3204050" {
		t.Errorf("expected id '3204050', got %v", result["id"])
	}
	if result["name"] != "DAYEUHKOLOT" {
		t.Errorf("expected name 'DAYEUHKOLOT', got %v", result["name"])
	}
	if result["level"] != "district" {
		t.Errorf("expected level 'district', got %v", result["level"])
	}
	parents, ok := result["parents"].([]any)
	if !ok || len(parents) != 2 {
		t.Fatalf("expected 2 parents, got %d", len(parents))
	}
	p1 := parents[0].(map[string]any)
	if p1["id"] != "32" || p1["name"] != "JAWA BARAT" || p1["level"] != "province" {
		t.Errorf("first parent mismatch: %v", p1)
	}
	p2 := parents[1].(map[string]any)
	if p2["id"] != "3204" || p2["name"] != "KABUPATEN BANDUNG" || p2["level"] != "regency" {
		t.Errorf("second parent mismatch: %v", p2)
	}
}

func TestLookupHandler_Village(t *testing.T) {
	result := lookupOK(t, "3204050001")
	if result["id"] != "3204050001" {
		t.Errorf("expected id '3204050001', got %v", result["id"])
	}
	if result["name"] != "CITANGGAL" {
		t.Errorf("expected name 'CITANGGAL', got %v", result["name"])
	}
	if result["level"] != "village" {
		t.Errorf("expected level 'village', got %v", result["level"])
	}
	parents, ok := result["parents"].([]any)
	if !ok || len(parents) != 3 {
		t.Fatalf("expected 3 parents, got %d", len(parents))
	}
	p1 := parents[0].(map[string]any)
	if p1["id"] != "32" || p1["level"] != "province" {
		t.Errorf("first parent mismatch: %v", p1)
	}
	p2 := parents[1].(map[string]any)
	if p2["id"] != "3204" || p2["level"] != "regency" {
		t.Errorf("second parent mismatch: %v", p2)
	}
	p3 := parents[2].(map[string]any)
	if p3["id"] != "3204050" || p3["level"] != "district" {
		t.Errorf("third parent mismatch: %v", p3)
	}
}

func lookupError(t *testing.T, id string) map[string]string {
	t.Helper()
	r := newWilayahTestRouter(t)
	req := httptest.NewRequest(http.MethodGet, "/api/lookup/"+id, http.NoBody)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	var body map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to decode error body: %v", err)
	}
	return body
}

func TestInvalidID_Lookup(t *testing.T) {
	r := newWilayahTestRouter(t)
	req := httptest.NewRequest(http.MethodGet, "/api/lookup/999999", http.NoBody)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for unknown ID, got %d", rec.Code)
	}
	body := lookupError(t, "999999")
	if body["error"] != "not found" {
		t.Errorf("expected error 'not found', got %q", body["error"])
	}
}

func TestInvalidID_Short(t *testing.T) {
	r := newWilayahTestRouter(t)
	req := httptest.NewRequest(http.MethodGet, "/api/lookup/1", http.NoBody)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for invalid ID length, got %d", rec.Code)
	}
}
