package specialty

// OntologyNode represents a node in the ISCO-08 classification hierarchy.
type OntologyNode struct {
	Code    string `json:"code"`
	Display string `json:"display"`
	Parent  string `json:"parent,omitempty"`
	Depth   int    `json:"depth"`
}

// SpecialtyNode represents a healthcare specialty from NUCC taxonomy.
type SpecialtyNode struct {
	NuccCode        string   `json:"nuccCode"`
	IscoCode        string   `json:"iscoCode"`
	Label           string   `json:"label"`
	DomainSignature []string `json:"domainSignature"`
}

// SpecialtyMatch represents a matched specialty from user input.
type SpecialtyMatch struct {
	NuccCode string   `json:"nuccCode"`
	Label    string   `json:"label"`
	Score    float64  `json:"score"`
	Domains  []string `json:"domains"`
}
