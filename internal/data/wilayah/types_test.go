package wilayah

import (
	"testing"
)

func TestProvinceCreation(t *testing.T) {
	p := Province{ID: "11", Name: "ACEH"}
	if p.ID != "11" {
		t.Errorf("expected ID '11', got %q", p.ID)
	}
	if p.Name != "ACEH" {
		t.Errorf("expected Name 'ACEH', got %q", p.Name)
	}
}

func TestRegencyCreation(t *testing.T) {
	r := Regency{ID: "1101", Name: "KABUPATEN ACEH SELATAN", ProvinceID: "11"}
	if r.ID != "1101" {
		t.Errorf("expected ID '1101', got %q", r.ID)
	}
	if r.Name != "KABUPATEN ACEH SELATAN" {
		t.Errorf("expected Name 'KABUPATEN ACEH SELATAN', got %q", r.Name)
	}
	if r.ProvinceID != "11" {
		t.Errorf("expected ProvinceID '11', got %q", r.ProvinceID)
	}
}

func TestDistrictCreation(t *testing.T) {
	d := District{ID: "110101", Name: "BAKONGAN", RegencyID: "1101"}
	if d.ID != "110101" {
		t.Errorf("expected ID '110101', got %q", d.ID)
	}
	if d.Name != "BAKONGAN" {
		t.Errorf("expected Name 'BAKONGAN', got %q", d.Name)
	}
	if d.RegencyID != "1101" {
		t.Errorf("expected RegencyID '1101', got %q", d.RegencyID)
	}
}

func TestVillageCreation(t *testing.T) {
	v := Village{ID: "1101012001", Name: "KEUDE BAKONGAN", DistrictID: "110101"}
	if v.ID != "1101012001" {
		t.Errorf("expected ID '1101012001', got %q", v.ID)
	}
	if v.Name != "KEUDE BAKONGAN" {
		t.Errorf("expected Name 'KEUDE BAKONGAN', got %q", v.Name)
	}
	if v.DistrictID != "110101" {
		t.Errorf("expected DistrictID '110101', got %q", v.DistrictID)
	}
}
