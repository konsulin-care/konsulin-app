package service

import (
	"encoding/json"
	"strings"
)

// searchset is a minimal FHIR searchset Bundle.
type searchset struct {
	Entry []searchEntry `json:"entry"`
}

// searchEntry is one Bundle entry with its search metadata.
type searchEntry struct {
	Resource json.RawMessage `json:"resource"`
	Search   searchMeta      `json:"search"`
}

// searchMeta carries the ?near distance extension from the FHIR backend.
type searchMeta struct {
	Extension []struct {
		URL           string `json:"url"`
		ValueDistance struct {
			Value float64 `json:"value"`
		} `json:"valueDistance"`
	} `json:"extension"`
}

// DistanceMeters returns the location-distance value when Blaze attached one.
func (e searchEntry) DistanceMeters() float64 {
	for _, ext := range e.Search.Extension {
		if ext.URL == distanceExtensionURL {
			return ext.ValueDistance.Value
		}
	}
	return 0
}

// codeableConcept is a minimal FHIR CodeableConcept.
type codeableConcept struct {
	Coding []struct {
		Code    string `json:"code"`
		Display string `json:"display"`
	} `json:"coding"`
	Text string `json:"text"`
}

type practitionerResource struct {
	ID   string `json:"id"`
	Name []struct {
		Text   string   `json:"text"`
		Family string   `json:"family"`
		Given  []string `json:"given"`
	} `json:"name"`
	Photo []struct {
		URL string `json:"url"`
	} `json:"photo"`
}

type locationResource struct {
	ID      string  `json:"id"`
	Name    string  `json:"name"`
	Address Address `json:"address"`
}

type serviceResource struct {
	ID        string            `json:"id"`
	Name      string            `json:"name"`
	Type      []codeableConcept `json:"type"`
	Extension []MoneyExtension  `json:"extension"`
}

type roleResource struct {
	ID           string `json:"id"`
	Practitioner struct {
		Reference string `json:"reference"`
	} `json:"practitioner"`
	Location []struct {
		Reference string `json:"reference"`
	} `json:"location"`
	HealthcareService []struct {
		Reference string `json:"reference"`
	} `json:"healthcareService"`
	Specialty     []codeableConcept `json:"specialty"`
	AvailableTime []struct {
		DaysOfWeek         []string `json:"daysOfWeek"`
		AvailableStartTime string   `json:"availableStartTime"`
		AvailableEndTime   string   `json:"availableEndTime"`
	} `json:"availableTime"`
}

type scheduleResource struct {
	ID    string `json:"id"`
	Actor []struct {
		Reference string `json:"reference"`
	} `json:"actor"`
}

// parsedService is a HealthcareService reduced to card fields.
type parsedService struct {
	ID         string
	Name       string
	DurMinutes int
	Fee        int
	Currency   string
	TypeCodes  []string
	TypeText   string
}

// logicalBundle holds cross-referenced entities after the join.
type logicalBundle struct {
	Roles              []roleResource
	Practitioners      map[string]string
	PractitionerPhotos map[string]string
	Locations          map[string]locationResource
	Services           map[string]parsedService
	SchedulesByRole    map[string]string
}

// resourceMeta extracts resourceType and id from a raw resource.
func resourceMeta(raw json.RawMessage) (string, string, error) {
	var meta struct {
		ResourceType string `json:"resourceType"`
		ID           string `json:"id"`
	}
	if err := json.Unmarshal(raw, &meta); err != nil {
		return "", "", err
	}
	return meta.ResourceType, meta.ID, nil
}

// tailRef strips the leading ResourceType/ from a reference, e.g. "PractitionerRole/role-1".
func tailRef(ref string) string {
	if idx := strings.IndexByte(ref, '/'); idx >= 0 {
		return ref[idx+1:]
	}
	return ref
}

// practitionerDisplayName prefers the full text name and falls back to parts.
func practitionerDisplayName(prac practitionerResource) string {
	if len(prac.Name) > 0 {
		if prac.Name[0].Text != "" {
			return prac.Name[0].Text
		}
		return strings.TrimSpace(strings.Join(prac.Name[0].Given, " ") + " " + prac.Name[0].Family)
	}
	return ""
}

// reduceService extracts card-relevant fields from a HealthcareService.
func reduceService(svc serviceResource) parsedService {
	out := parsedService{ID: svc.ID, Name: svc.Name, Currency: "IDR"}
	fee, feeErr := FeeFromExtensions(svc.Extension, feeExtensionURL)
	if feeErr == nil {
		out.Fee = fee.Value
		out.Currency = fee.Currency
	}
	for _, ext := range svc.Extension {
		if ext.URL == durationExtensionURL {
			out.DurMinutes = ext.ValueDuration.Value
		}
	}
	out.TypeCodes = serviceTypeCodes(svc.Type)
	out.TypeText = serviceTypeText(svc.Type)
	return out
}

// serviceTypeCodes collects the coding codes of the given type concepts.
func serviceTypeCodes(types []codeableConcept) []string {
	var out []string
	for _, typ := range types {
		for _, coding := range typ.Coding {
			if coding.Code != "" {
				out = append(out, coding.Code)
			}
		}
	}
	return out
}

// serviceTypeText returns the first non-empty text of the type concepts.
func serviceTypeText(types []codeableConcept) string {
	for _, typ := range types {
		if typ.Text != "" {
			return typ.Text
		}
	}
	return ""
}
