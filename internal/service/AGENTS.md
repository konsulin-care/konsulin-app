---
title: Agentic Documentation internal/service
description: Business logic — recommendation ranking, pricing computation, availability display
---

## Relevant ADRs

| ADR | Rationale                                                                                   |
| --- | ------------------------------------------------------------------------------------------- |
| 003 | Computes recommendation display from FHIR PractitionerRole, HealthcareService, availability |
| 004 | Computes availability display from practitioner schedule recurrence rules                   |
| 005 | Aggregates appointments across clinics into unified calendar timeline                       |
| 006 | Implements recommendation ranking algorithm that directly affects booking UX                |
| 007 | Computes `final_fee = base_fee + practitioner_adjustment + system_adjustment`               |
| 014 | `GetUpcomingSession` calls proxy endpoint instead of `fhir.Client` — per-request auth       |

## Rules

- Keep functions under 50 lines; split complex algorithms into smaller composable functions
- FHIR calls go through `internal/fhir/` client OR the proxy endpoint via `http.Client` with per-request auth from context. `GetUpcomingSession` uses the proxy to avoid shared auth state on `fhir.Client`.
- Recommendation algorithm can evolve without backend changes; version via function naming or strategy pattern
- Never call backend with non-FHIR parameters
- Service files: `recommendation.go` (availability + ranking), `pricing.go` (fee composition)
