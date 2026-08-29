package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/konsulin-care/konsulin-app/internal/data/wilayah"
)

// testIndex returns a minimal WilayahIndex for deterministic testing.
//
// Province IDs: 11=ACEH, 12=SUMATERA UTARA, 32=JAWA BARAT, 33=JAWA TENGAH
// Regency IDs: 3204=KABUPATEN BANDUNG, 3205=KABUPATEN GARUT, 3273=KOTA BANDUNG
//
//	3301=KABUPATEN CILACAP, 1101=KABUPATEN ACEH SELATAN
//
// District IDs: 3204050=DAYEUHKOLOT, 3204060=BALEENDAH (under 3204)
//
//	3205010=GARUT KOTA (under 3205)
//
// Village IDs: 3204050001=CITANGGAL, 3204050002=PASIRLUYU,
//
//	3204050003=SUKAPURA (under 3204050), 3204060001=BALEENDAH (under 3204060)
func testIndex() wilayah.WilayahIndex {
	return wilayah.WilayahIndex{
		Provinces: []wilayah.Province{
			{ID: "11", Name: "ACEH"},
			{ID: "12", Name: "SUMATERA UTARA"},
			{ID: "32", Name: "JAWA BARAT"},
			{ID: "33", Name: "JAWA TENGAH"},
		},
		Regencies: []wilayah.Regency{
			{ID: "3204", Name: "KABUPATEN BANDUNG", ProvinceID: "32"},
			{ID: "3205", Name: "KABUPATEN GARUT", ProvinceID: "32"},
			{ID: "3273", Name: "KOTA BANDUNG", ProvinceID: "32"},
			{ID: "3301", Name: "KABUPATEN CILACAP", ProvinceID: "33"},
			{ID: "1101", Name: "KABUPATEN ACEH SELATAN", ProvinceID: "11"},
		},
		Districts: []wilayah.District{
			{ID: "3204050", Name: "DAYEUHKOLOT", RegencyID: "3204"},
			{ID: "3204060", Name: "BALEENDAH", RegencyID: "3204"},
			{ID: "3205010", Name: "GARUT KOTA", RegencyID: "3205"},
		},
		Villages: []wilayah.Village{
			{ID: "3204050001", Name: "CITANGGAL", DistrictID: "3204050"},
			{ID: "3204050002", Name: "PASIRLUYU", DistrictID: "3204050"},
			{ID: "3204050003", Name: "SUKAPURA", DistrictID: "3204050"},
			{ID: "3204060001", Name: "BALEENDAH", DistrictID: "3204060"},
		},
		ProvinceByID: map[string]int{"11": 0, "12": 1, "32": 2, "33": 3},
		RegencyByID:  map[string]int{"3204": 0, "3205": 1, "3273": 2, "3301": 3, "1101": 4},
		DistrictByID: map[string]int{"3204050": 0, "3204060": 1, "3205010": 2},
		VillageByID:  map[string]int{"3204050001": 0, "3204050002": 1, "3204050003": 2, "3204060001": 3},
		RegenciesByProvince: map[string][]int{
			"32": {0, 1, 2},
			"33": {3},
			"11": {4},
		},
		DistrictsByRegency: map[string][]int{
			"3204": {0, 1},
			"3205": {2},
		},
		VillagesByDistrict: map[string][]int{
			"3204050": {0, 1, 2},
			"3204060": {3},
		},
		ProvinceByName: map[string][]int{
			"aceh":           {0},
			"sumatera utara": {1},
			"jawa barat":     {2},
			"jawa tengah":    {3},
		},
		RegencyByName: map[string][]int{
			"kabupaten bandung":      {0},
			"kabupaten garut":        {1},
			"kota bandung":           {2},
			"kabupaten cilacap":      {3},
			"kabupaten aceh selatan": {4},
		},
		DistrictByName: map[string][]int{
			"dayeuhkolot": {0},
			"baleendah":   {1},
			"garut kota":  {2},
		},
		VillageByName: map[string][]int{
			"citanggal": {0},
			"pasirluyu": {1},
			"sukapura":  {2},
			"baleendah": {3},
		},
	}
}

func newWilayahTestRouter(t *testing.T) *chi.Mux {
	t.Helper()
	idx := testIndex()
	h := NewWilayahHandler(&idx)
	r := chi.NewRouter()
	r.Get("/api/provinces", h.Provinces)
	r.Get("/api/provinces/search", h.ProvinceSearch)
	r.Get("/api/regencies/{provinceId}", h.Regencies)
	r.Get("/api/regencies/search", h.RegencySearch)
	r.Get("/api/districts/{regencyId}", h.Districts)
	r.Get("/api/villages/{districtId}", h.Villages)
	r.Get("/api/lookup/{id}", h.Lookup)
	return r
}

func getOK(t *testing.T, url string) *httptest.ResponseRecorder {
	t.Helper()
	r := newWilayahTestRouter(t)
	req := httptest.NewRequest(http.MethodGet, url, http.NoBody)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("GET %s expected 200, got %d", url, rec.Code)
	}
	return rec
}

func TestProvincesHandler(t *testing.T) {
	rec := getOK(t, "/api/provinces")
	var provinces []wilayah.Province
	if err := json.Unmarshal(rec.Body.Bytes(), &provinces); err != nil {
		t.Fatalf("failed to decode provinces: %v", err)
	}
	if len(provinces) != 4 {
		t.Fatalf("expected 4 provinces, got %d", len(provinces))
	}
	if provinces[0].ID != "11" || provinces[0].Name != "ACEH" {
		t.Errorf("first province mismatch: %+v", provinces[0])
	}
}

func TestRegenciesHandler(t *testing.T) {
	rec := getOK(t, "/api/regencies/32")
	var regencies []wilayah.Regency
	if err := json.Unmarshal(rec.Body.Bytes(), &regencies); err != nil {
		t.Fatalf("failed to decode regencies: %v", err)
	}
	if len(regencies) != 3 {
		t.Fatalf("expected 3 regencies, got %d", len(regencies))
	}
	if regencies[0].Name != "KABUPATEN BANDUNG" {
		t.Errorf("expected KABUPATEN BANDUNG, got %s", regencies[0].Name)
	}
}

func TestRegenciesHandler_UnknownProvince(t *testing.T) {
	rec := getOK(t, "/api/regencies/99")
	var regencies []wilayah.Regency
	if err := json.Unmarshal(rec.Body.Bytes(), &regencies); err != nil {
		t.Fatalf("failed to decode regencies: %v", err)
	}
	if len(regencies) != 0 {
		t.Fatalf("expected 0 regencies, got %d", len(regencies))
	}
}

func TestDistrictsHandler(t *testing.T) {
	rec := getOK(t, "/api/districts/3204")
	var districts []wilayah.District
	if err := json.Unmarshal(rec.Body.Bytes(), &districts); err != nil {
		t.Fatalf("failed to decode districts: %v", err)
	}
	if len(districts) != 2 {
		t.Fatalf("expected 2 districts, got %d", len(districts))
	}
	if districts[0].Name != "DAYEUHKOLOT" {
		t.Errorf("expected DAYEUHKOLOT, got %s", districts[0].Name)
	}
}

func TestVillagesHandler(t *testing.T) {
	rec := getOK(t, "/api/villages/3204050")
	var villages []wilayah.Village
	if err := json.Unmarshal(rec.Body.Bytes(), &villages); err != nil {
		t.Fatalf("failed to decode villages: %v", err)
	}
	if len(villages) != 3 {
		t.Fatalf("expected 3 villages, got %d", len(villages))
	}
	if villages[0].Name != "CITANGGAL" {
		t.Errorf("expected CITANGGAL, got %s", villages[0].Name)
	}
}
