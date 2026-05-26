---
title: Agentic Documentation internal
description: Shared Go packages — handler, service, fhir, config, session
---

## Relevant ADRs

| ADR | Rationale                                                                              |
| --- | -------------------------------------------------------------------------------------- |
| 001 | All internal packages serve the Go SSR frontend                                        |
| 002 | FHIR compliance dictates how handler, service, and fhir packages interact with backend |

## Rules

- No circular imports between `internal/` packages
- `handler/` depends on `service/`, never the reverse
- `service/` depends on `fhir/` and `config/`
- `handler/` may depend on `session/` directly; `service/` must not
- One file per handler group in `handler/`
- One struct per file in `fhir/`
- All Go code uses explicit error handling: return errors, never panic
- Prefix interfaces with `I` only when disambiguation is needed
