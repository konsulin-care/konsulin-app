// Package wilayah provides Indonesia administrative region data types and pre-built hashmap
// indexes for O(1) hierarchical navigation. Data is generated at build time by go:generate.
package wilayah

// WilayahIndex holds all Indonesia region data in pre-built hashmap indexes.
// All fields are populated at build time by the go:generate script.
// Zero runtime network calls and zero init() overhead.
type WilayahIndex struct {
	Provinces  []Province  `json:"provinces"`
	Regencies  []Regency  `json:"regencies"`
	Districts  []District `json:"districts"`
	Villages   []Village  `json:"villages"`

	ProvinceByID  map[string]int `json:"province_by_id"`
	RegencyByID   map[string]int `json:"regency_by_id"`
	DistrictByID  map[string]int `json:"district_by_id"`
	VillageByID   map[string]int `json:"village_by_id"`

	RegenciesByProvince   map[string][]int `json:"regencies_by_province"`
	DistrictsByRegency    map[string][]int `json:"districts_by_regency"`
	VillagesByDistrict    map[string][]int `json:"villages_by_district"`

	ProvinceByName map[string][]int `json:"province_by_name"`
	RegencyByName  map[string][]int `json:"regency_by_name"`
	DistrictByName map[string][]int `json:"district_by_name"`
	VillageByName  map[string][]int `json:"village_by_name"`
}
