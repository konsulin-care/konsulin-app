---
title: Agentic Documentation internal/fhir
description: FHIR R4 resource types as Go structs and HTTP client with auth
---

## Relevant ADRs

| ADR | Rationale                                                                                        |
| --- | ------------------------------------------------------------------------------------------------ |
| 002 | Strict FHIR R4 Go structs; Bundle pagination via `Bundle.link[rel=next]`; no custom query params |
| 004 | Models PractitionerRole, HealthcareService, Schedule, Slot types for dynamic scheduling          |
| 005 | Fetches Appointment bundles across multiple clinics for unified calendar                         |
| 006 | Queries FHIR resources needed for recommendation computation                                     |

## Rules

- One struct per file; file name matches resource name (`practitioner_role.go`, `appointment.go`, etc.)
- Always paginate with `_count` parameter and `Bundle.link[rel=next]` iterator
- Use `_include` parameter to resolve referenced resources in a single bundle (avoid N+1)
- Cache stable resources (Practitioner, Organization) with TTL — never cache volatile resources (Slot, Appointment)
- Use `_summary=count` for list endpoints when only metadata/count needed
- PractitionerRole contains nested availability by location — parse carefully for clinic-scoped vs practitioner-scoped scheduling
- FHIR HTTP client handles auth headers, retry, and timeout; never bypass client with raw HTTP calls
