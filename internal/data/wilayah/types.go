package wilayah

// Province represents a first-level administrative division (provinsi).
type Province struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Regency represents a second-level administrative division (kabupaten/kota).
type Regency struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	ProvinceID string `json:"province_id"`
}

// District represents a third-level administrative division (kecamatan).
type District struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	RegencyID string `json:"regency_id"`
}

// Village represents a fourth-level administrative division (desa/kelurahan).
type Village struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	DistrictID string `json:"district_id"`
}
