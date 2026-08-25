package wilayah

import (
	"testing"
)

func TestIndexProvinceLookup(t *testing.T) {
	// Build a minimal index manually (mimics what go:generate produces)
	idx := WilayahIndex{
		Provinces: []Province{
			{ID: "11", Name: "ACEH"},
			{ID: "12", Name: "SUMATERA UTARA"},
		},
		ProvinceByID: map[string]int{
			"11": 0,
			"12": 1,
		},
		ProvinceByName: map[string][]int{
			"aceh":           {0},
			"sumatera utara": {1},
		},
	}

	// Lookup by ID
	if i, ok := idx.ProvinceByID["11"]; !ok {
		t.Error("expected province '11' to exist in ProvinceByID")
	} else if idx.Provinces[i].Name != "ACEH" {
		t.Errorf("expected name 'ACEH', got %q", idx.Provinces[i].Name)
	}

	// Lookup by name (case-insensitive key)
	if indices, ok := idx.ProvinceByName["aceh"]; !ok {
		t.Error("expected 'aceh' to exist in ProvinceByName")
	} else if len(indices) != 1 || idx.Provinces[indices[0]].Name != "ACEH" {
		t.Errorf("expected one result for 'aceh', got %v", indices)
	}
}

func TestIndexHierarchicalLookup(t *testing.T) {
	idx := WilayahIndex{
		Provinces: []Province{
			{ID: "11", Name: "ACEH"},
		},
		Regencies: []Regency{
			{ID: "1101", Name: "KABUPATEN ACEH SELATAN", ProvinceID: "11"},
			{ID: "1102", Name: "KABUPATEN ACEH TENGGARA", ProvinceID: "11"},
		},
		RegenciesByProvince: map[string][]int{
			"11": {0, 1},
		},
	}

	// Lookup regencies by province
	indices := idx.RegenciesByProvince["11"]
	if len(indices) != 2 {
		t.Fatalf("expected 2 regencies for province 11, got %d", len(indices))
	}
	if idx.Regencies[indices[0]].Name != "KABUPATEN ACEH SELATAN" {
		t.Errorf("expected 'KABUPATEN ACEH SELATAN', got %q", idx.Regencies[indices[0]].Name)
	}
}

func TestIndexEmptyLookupReturnsNil(_ *testing.T) {
	// A zero-value WilayahIndex has nil maps — lookups should not panic
	idx := WilayahIndex{}

	// These should not panic even with nil maps
	_ = idx.ProvinceByID["anything"]
	_ = idx.ProvinceByName["anything"]
	_ = idx.RegenciesByProvince["anything"]
	_ = idx.RegencyByID["anything"]
	_ = idx.VillageByName["anything"]
}
