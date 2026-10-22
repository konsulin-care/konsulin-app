package wilayah

import (
	"testing"
)

func TestNormalizeNameAllCapsProvince(t *testing.T) {
	got := NormalizeName("DKI JAKARTA")
	want := "DKI Jakarta"
	if got != want {
		t.Errorf("NormalizeName(%q) = %q, want %q", "DKI JAKARTA", got, want)
	}
}

func TestNormalizeNameAllCapsDIPreserved(t *testing.T) {
	got := NormalizeName("DI YOGYAKARTA")
	want := "DI Yogyakarta"
	if got != want {
		t.Errorf("NormalizeName(%q) = %q, want %q", "DI YOGYAKARTA", got, want)
	}
}

func TestNormalizeNameAllCapsRegular(t *testing.T) {
	got := NormalizeName("JAWA BARAT")
	want := "Jawa Barat"
	if got != want {
		t.Errorf("NormalizeName(%q) = %q, want %q", "JAWA BARAT", got, want)
	}
}

func TestNormalizeNameLowerCaseRegency(t *testing.T) {
	got := NormalizeName("kabupaten bogor")
	want := "Kabupaten Bogor"
	if got != want {
		t.Errorf("NormalizeName(%q) = %q, want %q", "kabupaten bogor", got, want)
	}
}

func TestNormalizeNameLowerCaseKota(t *testing.T) {
	got := NormalizeName("kota bekasi")
	want := "Kota Bekasi"
	if got != want {
		t.Errorf("NormalizeName(%q) = %q, want %q", "kota bekasi", got, want)
	}
}

func TestNormalizeNameLowerCaseDistrict(t *testing.T) {
	got := NormalizeName("jakarta pusat")
	want := "Jakarta Pusat"
	if got != want {
		t.Errorf("NormalizeName(%q) = %q, want %q", "jakarta pusat", got, want)
	}
}

func TestNormalizeNameSingleWord(t *testing.T) {
	got := NormalizeName("ACEH")
	want := "Aceh"
	if got != want {
		t.Errorf("NormalizeName(%q) = %q, want %q", "ACEH", got, want)
	}
}

func TestNormalizeNameEmptyString(t *testing.T) {
	got := NormalizeName("")
	want := ""
	if got != want {
		t.Errorf("NormalizeName(%q) = %q, want %q", "", got, want)
	}
}

func TestNormalizeAllNamesModifiesAllSlices(t *testing.T) {
	provinces := []Province{
		{ID: "31", Name: "DKI JAKARTA"},
		{ID: "34", Name: "DI YOGYAKARTA"},
	}
	regencies := []Regency{
		{ID: "3171", Name: "KOTA JAKARTA SELATAN", ProvinceID: "31"},
	}
	districts := []District{
		{ID: "3171010", Name: "JAKARTA SELATAN", RegencyID: "3171"},
	}
	villages := []Village{
		{ID: "3171010001", Name: "KEBAYORAN LAMA", DistrictID: "3171010"},
	}

	NormalizeAllNames(provinces, regencies, districts, villages)

	tests := []struct {
		label string
		got   string
		want  string
	}{
		{"province DKI", provinces[0].Name, "DKI Jakarta"},
		{"province DI", provinces[1].Name, "DI Yogyakarta"},
		{"regency", regencies[0].Name, "Kota Jakarta Selatan"},
		{"district", districts[0].Name, "Jakarta Selatan"},
		{"village", villages[0].Name, "Kebayoran Lama"},
	}

	for _, tt := range tests {
		if tt.got != tt.want {
			t.Errorf("%s = %q, want %q", tt.label, tt.got, tt.want)
		}
	}
}
