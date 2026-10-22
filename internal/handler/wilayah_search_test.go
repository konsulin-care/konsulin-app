package handler

import (
	"encoding/json"
	"testing"

	"github.com/konsulin-care/konsulin-app/internal/data/wilayah"
)

func namesToMap(items []wilayah.Province) map[string]bool {
	m := make(map[string]bool, len(items))
	for _, p := range items {
		m[p.Name] = true
	}
	return m
}

func regencyNamesToMap(items []wilayah.Regency) map[string]bool {
	m := make(map[string]bool, len(items))
	for _, r := range items {
		m[r.Name] = true
	}
	return m
}

func TestProvinceSearchHandler(t *testing.T) {
	rec := getOK(t, "/api/provinces/search?q=ja")
	var provinces []wilayah.Province
	if err := json.Unmarshal(rec.Body.Bytes(), &provinces); err != nil {
		t.Fatalf("failed to decode provinces: %v", err)
	}
	if len(provinces) != 2 {
		t.Fatalf("expected 2 provinces, got %d", len(provinces))
	}
	names := namesToMap(provinces)
	if !names["JAWA BARAT"] || !names["JAWA TENGAH"] {
		t.Errorf("expected JAWA BARAT and JAWA TENGAH, got %v", names)
	}
}

func TestProvinceSearchHandler_NoMatch(t *testing.T) {
	rec := getOK(t, "/api/provinces/search?q=zzz")
	var provinces []wilayah.Province
	if err := json.Unmarshal(rec.Body.Bytes(), &provinces); err != nil {
		t.Fatalf("failed to decode provinces: %v", err)
	}
	if len(provinces) != 0 {
		t.Fatalf("expected 0 provinces, got %d", len(provinces))
	}
}

func TestProvinceSearchHandler_EmptyQuery(t *testing.T) {
	rec := getOK(t, "/api/provinces/search")
	var provinces []wilayah.Province
	if err := json.Unmarshal(rec.Body.Bytes(), &provinces); err != nil {
		t.Fatalf("failed to decode provinces: %v", err)
	}
	if len(provinces) != 0 {
		t.Fatalf("expected 0 provinces, got %d", len(provinces))
	}
}

func TestRegencySearchHandler(t *testing.T) {
	rec := getOK(t, "/api/regencies/search?q=kab&province=32")
	var regencies []wilayah.Regency
	if err := json.Unmarshal(rec.Body.Bytes(), &regencies); err != nil {
		t.Fatalf("failed to decode regencies: %v", err)
	}
	if len(regencies) != 2 {
		t.Fatalf("expected 2 regencies, got %d", len(regencies))
	}
	names := regencyNamesToMap(regencies)
	if !names["KABUPATEN BANDUNG"] || !names["KABUPATEN GARUT"] {
		t.Errorf("expected KABUPATEN BANDUNG and KABUPATEN GARUT, got %v", names)
	}
}

func TestRegencySearchHandler_NoProvince(t *testing.T) {
	rec := getOK(t, "/api/regencies/search?q=kab")
	var regencies []wilayah.Regency
	if err := json.Unmarshal(rec.Body.Bytes(), &regencies); err != nil {
		t.Fatalf("failed to decode regencies: %v", err)
	}
	if len(regencies) != 4 {
		t.Fatalf("expected 4 regencies, got %d", len(regencies))
	}
}
