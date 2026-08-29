# ADR-001 — Frontend Architecture for Healthcare Scheduling PWA

## Status

Proposed

---

# Executive Summary

This Architecture Decision Record (ADR) defines the frontend architecture for a healthcare scheduling and care coordination platform built around:

- FHIR-native interoperability
- WhatsApp-driven onboarding
- recommendation-first patient booking
- practitioner-centric scheduling
- multi-clinic healthcare operations
- offline-capable assessments
- mobile-first workflows

The platform integrates with an existing backend ecosystem:

| Component                  | Responsibility                          |
| -------------------------- | --------------------------------------- |
| Blaze FHIR                 | FHIR persistence                        |
| Backend scheduling service | scheduling validation and orchestration |
| SuperTokens (client SDK)   | browser-side auth, session tokens       |
| SuperTokens (Go SDK)       | backend API session verification        |
| Go SSR bridge              | reads auth cookies, proxies requests    |
| N8N                        | automation/workflows                    |
| Xendit                     | payment processing                      |

The frontend system is intentionally designed as:

- lightweight
- server-side rendered
- low-memory
- operationally simple
- standards-preserving

The frontend does NOT implement:

- scheduling authority
- booking correctness
- healthcare persistence
- business rule enforcement

Those remain delegated to the backend service.

---

# Key Architectural Decisions

| Area                       | Decision                                    |
| -------------------------- | ------------------------------------------- |
| Frontend architecture      | Server-side rendered Go web application     |
| Frontend interaction model | HTMX-driven progressive enhancement         |
| Styling                    | Tailwind CSS                                |
| PWA support                | Service worker + IndexedDB                  |
| Offline assessment support | AEHRC Smart Forms (client-side React SPA)   |
| Backend interoperability   | Strict FHIR R4 compliance                   |
| Scheduling model           | Dynamic interval computation                |
| Recommendation strategy    | Frontend orchestration over FHIR resources  |
| Runtime configuration      | Go reads .env directly at startup           |
| Auth architecture          | Client-side SuperTokens SDK, Go SSR bridges |
| UI architecture            | Role-context-driven interfaces              |
| Multi-role handling        | Explicit active-role switching              |
| Record rendering           | Progressive timeline-based loading          |
| Deployment model           | Docker image distributed via GHCR           |

---

# Context

The platform requirements include:

- 10,000 MAU
- ~100 concurrent users
- mobile-first operation
- offline assessment capability
- low infrastructure cost
- multi-role healthcare operations
- strict FHIR interoperability
- dynamic scheduling without fixed slots

The system must support:

- patients
- practitioners
- clinic administrators

while maintaining:

- low RAM consumption
- low operational complexity
- standards compatibility

---

# Decision 1 — Use Go SSR Frontend Instead of Next.js SPA/SSR

## Decision

The frontend will be implemented as a server-side rendered Go web application instead of React-heavy SPA or Next.js SSR architecture.

---

## Rationale

The platform prioritizes:

- low memory usage
- low CPU usage
- mobile responsiveness
- operational simplicity
- lightweight rendering
- low hydration overhead

Typical React/Next.js architectures exceed the target operational footprint.

Go SSR provides:

- low baseline memory
- efficient concurrency
- efficient JSON processing
- simple deployment
- predictable resource usage

---

## Selected Stack

| Component                    | Technology                     |
| ---------------------------- | ------------------------------ |
| Language                     | Go                             |
| Router                       | Chi                            |
| HTML templating              | templ                          |
| Dynamic interactions         | HTMX                           |
| Styling                      | Tailwind CSS                   |
| Minimal client interactivity | Alpine.js                      |
| PWA support                  | Service Worker (plain, manual) |
| Offline storage              | IndexedDB                      |
| Auth (client-side)           | supertokens-auth-react SDK     |
| Auth (Go SSR bridge)         | Cookie reading + request proxy |

---

## Consequences

### Positive

- lower RAM consumption
- faster cold starts
- simpler deployment
- smaller JS payloads
- reduced browser memory usage
- improved low-end smartphone performance

### Negative

- reduced SPA-style interactivity
- fewer ecosystem abstractions
- more server-driven rendering complexity

---

# Decision 2 — Backend Remains Strictly FHIR-Compliant

## Decision

The backend will remain strictly FHIR-native and avoid introducing non-standard convenience endpoints.

---

## Rationale

The backend is intended to preserve:

- interoperability
- standards compliance
- long-term maintainability
- healthcare portability

Frontend orchestration responsibilities are acceptable because:

- backend remains authoritative
- booking validation remains server-side
- scheduling conflicts remain backend-controlled

---

## Consequences

Frontend must:

- aggregate FHIR resources
- compute recommendation shaping
- interpret PractitionerRole relationships
- compute nearest availability displays

while backend remains:

- scheduling authority
- booking validator
- persistence layer

---

# Decision 3 — Frontend Performs Recommendation Shaping

## Decision

Frontend SSR layer computes recommendation displays from FHIR resources.

---

## Example

Magic link:

```text
/recommendations?intent=specialized.neurology.headache&modality=inperson&urgency=asap
```

Translated into:

```text
PractitionerRole?specialty=neurology,headache
```

Frontend:

- filters PractitionerRoles
- evaluates nearby availability
- ranks recommendations
- displays HealthcareServices and fees

---

## Rationale

This preserves:

- backend FHIR purity
- frontend flexibility
- recommendation UX customization

without polluting backend APIs.

---

# Decision 4 — Dynamic Scheduling Model

## Decision

The system uses continuous availability scheduling instead of fixed appointment slots.

---

## Practitioner Defines

- working hours
- clinic/location
- services
- recurrence

---

## Backend Computes

- intervals
- overlaps
- availability
- conflict prevention

---

## Rationale

Healthcare sessions have:

- variable durations
- mixed modalities
- non-uniform schedules

Fixed-slot systems are operationally limiting.

---

# Decision 5 — Unified Practitioner Calendar

## Decision

Practitioners operate on one continuous unified calendar across clinics.

---

## Rationale

Practitioners think operationally as:

```text
my day
```

not:

```text
clinic-separated schedules
```

---

## UI Characteristics

Calendar uses:

- color coding
- tags
- labels

instead of:

- segmented clinic columns

---

# Decision 6 — Recommendation-First Patient UX

## Decision

Patients first see curated appointment recommendations instead of full calendars.

---

## Recommendation Cards Display

- practitioner
- specialty
- HealthcareService
- duration
- modality
- final fee
- nearest availability

---

## Rationale

Patients optimize for:

- speed
- trust
- convenience
- transparency

not healthcare infrastructure navigation.

---

# Decision 7 — Pricing Model

## Decision

Pricing is composed of:

```text
base fee
+ practitioner adjustment
+ system adjustment
= final fee
```

---

## Ownership Model

| Layer        | Responsibility             |
| ------------ | -------------------------- |
| Organization | canonical base fee         |
| Practitioner | optional adjustment        |
| System       | taxes/platform adjustments |

---

## Governance

Practitioners:

- may propose draft services
- may suggest draft base fees

Clinic admins:

- approve services
- govern canonical base fees

---

## Rationale

This preserves:

- organization governance
- practitioner flexibility
- pricing transparency

---

# Decision 8 — Explicit Role Context Switching

## Decision

Users with multiple roles must explicitly switch active role contexts.

---

## Example

```text
Role:
[ Practitioner ▼ ]
```

---

## Rationale

Merged-role interfaces create:

- permission ambiguity
- operational confusion
- dangerous accidental actions

Healthcare systems require explicit operational context.

---

# Decision 9 — Clinic Context Selection for Clinic Admins

## Decision

Clinic administrators must explicitly select active clinic context when managing multiple clinics.

---

## Example

```text
Current Clinic:
[ Jakarta Selatan ▼ ]
```

---

## Rationale

Prevents:

- cross-clinic governance confusion
- incorrect practitioner assignment
- service management ambiguity

---

# Decision 10 — Offline Assessment Support

## Decision

Assessments support offline completion and delayed synchronization.
AEHRC Smart Forms renders Questionnaire in a dedicated React SPA page
embedded within the Go SSR application shell. The Go server bridges
API requests to the backend FHIR service.

---

## Technology

| Component               | Technology                          |
| ----------------------- | ----------------------------------- |
| Questionnaire rendering | AEHRC Smart Forms (client-side SPA) |
| Offline persistence     | IndexedDB                           |
| Sync replay             | service worker queue                |
| Integration mode        | Dedicated React SPA route in Go SSR |
| Go SSR role             | Serve SPA shell + proxy API calls   |

---

## Behavior

When offline:

- Questionnaire loads from cache (service worker)
- QuestionnaireResponse stored locally in IndexedDB
- Sync occurs after reconnection via service worker queue

---

## Rationale

AEHRC is a React component with hooks and context providers —
it cannot render server-side in Go SSR. Embedding it as a client-side
React SPA is the correct integration mode. The Go server simply serves
the shell page and proxies backend requests.

Assessment workflows must remain:

- mobile-friendly
- interruption-tolerant
- low-connectivity compatible

---

# Decision 11 — Timeline-Based Personal Health Record Rendering

## Decision

Personal health records render progressively as chronological timelines.

---

## Initial Load

Only:

- recent items
- latest assessments
- recent encounters
- summarized conditions

---

## Progressive Expansion

Additional records load:

- on scroll
- by category
- by older time windows

---

## Rationale

FHIR bundles may become very large.

Progressive rendering reduces:

- mobile RAM consumption
- render cost
- cognitive overload

---

# Decision 12 — Runtime Configuration via Environment Variables

## Decision

The Go SSR server reads configuration directly from environment variables
at startup via `os.Getenv()`. No startup script or intermediate JSON file.

---

## Flow

```text
.env → Go reads at startup (os.Getenv)
       ↓
Config struct populated once
       ↓
Available to all handlers via dependency injection
```

---

## Rationale

Go reads `.env` natively. The startup injection pattern (.env → script →
runtime-config.json → fetch) was designed for SPAs where the browser
needs runtime config. In Go SSR, the server has direct access to env
vars at request time. No intermediate file is needed.

Preserves:

- immutable Docker images
- runtime configurability via docker --env-file
- deployment portability
- GHCR compatibility

without rebuild requirements or startup scripts.

---

# Final User Experience Architecture

# Patient UX Philosophy

```text
recommendation-first
```

Focus:

- fast booking
- confidence
- transparency
- simplicity

---

# Practitioner UX Philosophy

```text
timeline-first
```

Focus:

- schedule management
- patient continuity
- session preparation

---

# Clinic Admin UX Philosophy

```text
operational governance
```

Focus:

- practitioner management
- organizational governance
- service approvals
- operational oversight

---

# Expected Server Resource Consumption

## Go Frontend SSR Layer

Expected operational profile:

| Metric                 | Estimated             |
| ---------------------- | --------------------- |
| Idle RAM               | 15–40 MB              |
| Under moderate load    | 50–120 MB             |
| CPU baseline           | very low              |
| Recommended deployment | 1 vCPU / 1 GB RAM     |
| Target concurrency     | ~100 concurrent users |

---

# Browser Resource Targets

| Area               | Target                   |
| ------------------ | ------------------------ |
| Mobile RAM usage   | <=100 MB                 |
| Go SSR pages JS    | ~0 KB (HTMX + Alpine.js) |
| Assessment page JS | ~200 KB (React + AEHRC)  |
| Hydration          | none (Go SSR)            |
| Offline storage    | IndexedDB only           |

---

# Optimization Strategies

| Strategy                   | Purpose                 |
| -------------------------- | ----------------------- |
| SSR rendering              | reduce browser work     |
| HTMX partial updates       | avoid SPA hydration     |
| Progressive loading        | reduce memory spikes    |
| Timeline rendering         | reduce DOM size         |
| Virtualized lists          | reduce mobile overhead  |
| Limited FHIR query windows | reduce payload size     |
| Cached stable resources    | reduce repeated parsing |

---

# Dependencies

## Core Frontend

| Dependency   | Purpose                          |
| ------------ | -------------------------------- |
| Go           | server runtime                   |
| Chi          | HTTP routing                     |
| templ        | HTML templating                  |
| HTMX         | partial dynamic interactions     |
| Tailwind CSS | styling                          |
| Alpine.js    | lightweight client interactivity |

---

## PWA

| Dependency     | Purpose           |
| -------------- | ----------------- |
| Service Worker | offline caching   |
| IndexedDB      | local persistence |

---

## Healthcare/FHIR

| Dependency        | Purpose                  | Integration mode            |
| ----------------- | ------------------------ | --------------------------- |
| AEHRC Smart Forms | Questionnaire rendering  | Client-side React SPA in Go |
| Blaze FHIR        | FHIR persistence backend | Direct backend-to-backend   |

---

## Existing Backend Integrations

| Dependency  | Purpose         |
| ----------- | --------------- |
| SuperTokens | authentication  |
| N8N         | automation      |
| Xendit      | payment gateway |

---

# Final Outcome

The resulting architecture provides:

- FHIR-native interoperability
- low operational cost
- low-memory mobile-first UX
- offline-capable assessments
- dynamic healthcare scheduling
- multi-clinic operational governance
- scalable healthcare workflows

while remaining deployable within:

```text
1 vCPU
1 GB RAM
```

for the targeted operational scale.
