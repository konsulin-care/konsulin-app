package wilayah

import (
	"reflect"
	"testing"
)

func TestBuildIndexesFlatArrays(t *testing.T) {
	provinces := []Province{
		{ID: "11", Name: "ACEH"},
	}
	regencies := []Regency{
		{ID: "1101", Name: "KABUPATEN ACEH SELATAN", ProvinceID: "11"},
	}
	idx := BuildIndexes(provinces, regencies, nil, nil)

	if !reflect.DeepEqual(idx.Provinces, provinces) {
		t.Error("Provinces mismatch")
	}
	if !reflect.DeepEqual(idx.Regencies, regencies) {
		t.Error("Regencies mismatch")
	}
}

func TestBuildIndexesIDLookup(t *testing.T) {
	provinces := []Province{
		{ID: "11", Name: "ACEH"},
		{ID: "12", Name: "SUMATERA UTARA"},
	}
	idx := BuildIndexes(provinces, nil, nil, nil)

	if i, ok := idx.ProvinceByID["11"]; !ok || idx.Provinces[i].Name != "ACEH" {
		t.Error("ProvinceByID['11'] failed")
	}
	if i, ok := idx.ProvinceByID["12"]; !ok || idx.Provinces[i].Name != "SUMATERA UTARA" {
		t.Error("ProvinceByID['12'] failed")
	}
}

func TestBuildIndexesParentLookup(t *testing.T) {
	regencies := []Regency{
		{ID: "1101", Name: "KABUPATEN ACEH SELATAN", ProvinceID: "11"},
		{ID: "1102", Name: "KABUPATEN ACEH TENGGARA", ProvinceID: "11"},
		{ID: "1201", Name: "KABUPATEN TAPANULI TENGAH", ProvinceID: "12"},
	}
	districts := []District{
		{ID: "110101", Name: "BAKONGAN", RegencyID: "1101"},
		{ID: "110102", Name: "KLUET UTARA", RegencyID: "1101"},
	}
	villages := []Village{
		{ID: "1101012001", Name: "KEUDE BAKONGAN", DistrictID: "110101"},
		{ID: "1101012002", Name: "GAMPONG BARO", DistrictID: "110101"},
	}
	idx := BuildIndexes(nil, regencies, districts, villages)

	provRegencies := idx.RegenciesByProvince["11"]
	if len(provRegencies) != 2 {
		t.Fatalf("expected 2 regencies for province 11, got %d", len(provRegencies))
	}
	if idx.Regencies[provRegencies[0]].Name != "KABUPATEN ACEH SELATAN" {
		t.Errorf("expected 'KABUPATEN ACEH SELATAN', got %q", idx.Regencies[provRegencies[0]].Name)
	}

	regencyDistricts := idx.DistrictsByRegency["1101"]
	if len(regencyDistricts) != 2 {
		t.Fatalf("expected 2 districts for regency 1101, got %d", len(regencyDistricts))
	}

	districtVillages := idx.VillagesByDistrict["110101"]
	if len(districtVillages) != 2 {
		t.Fatalf("expected 2 villages for district 110101, got %d", len(districtVillages))
	}
}

func TestBuildIndexesNameLookup(t *testing.T) {
	provinces := []Province{
		{ID: "11", Name: "ACEH"},
	}
	regencies := []Regency{
		{ID: "1101", Name: "KABUPATEN ACEH SELATAN", ProvinceID: "11"},
	}
	districts := []District{
		{ID: "110101", Name: "BAKONGAN", RegencyID: "1101"},
	}
	villages := []Village{
		{ID: "1101012001", Name: "KEUDE BAKONGAN", DistrictID: "110101"},
	}
	idx := BuildIndexes(provinces, regencies, districts, villages)

	if indices, ok := idx.ProvinceByName["aceh"]; !ok || len(indices) != 1 {
		t.Error("ProvinceByName['aceh'] should have 1 entry")
	}
	if indices, ok := idx.RegencyByName["kabupaten aceh selatan"]; !ok || len(indices) != 1 {
		t.Error("RegencyByName['kabupaten aceh selatan'] should have 1 entry")
	}
	if indices, ok := idx.DistrictByName["bakongan"]; !ok || len(indices) != 1 {
		t.Error("DistrictByName['bakongan'] should have 1 entry")
	}
	if indices, ok := idx.VillageByName["keude bakongan"]; !ok || len(indices) != 1 {
		t.Error("VillageByName['keude bakongan'] should have 1 entry")
	}
}
