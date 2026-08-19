package service

// nearbyBySpecialty is the decision-tree closeness map used to fill
// recommendation slots when the exact-specialty match yields fewer than
// maxRecommendations cards. The lists are ordered by semantic closeness to
// the key specialty, derived from the decision-tree domains in
// src/constants/recommendation-decision-tree.
var nearbyBySpecialty = map[string][]string{
	"psychology":       {"general-practice", "orthopedics", "psychiatry", "neuropsychology"},
	"psychiatry":       {"psychology", "general-practice"},
	"neuropsychology":  {"psychology", "orthopedics", "general-practice"},
	"orthopedics":      {"general-practice", "psychology"},
	"general-practice": {"psychology", "orthopedics", "psychiatry", "neuropsychology"},
}

// nearbySpecialties returns the ordered list of decision-tree specialties
// semantically close to the given specialty, used to fill recommendation
// slots. Unknown or unmapped specialties yield an empty list (exact-only).
func nearbySpecialties(specialty string) []string {
	return nearbyBySpecialty[specialty]
}
