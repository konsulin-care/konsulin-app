---
title: Project Structure
description: Go BFF plus Next.js static frontend directory layout
status: updated
date: 2026-11-24
---

# Overview

The frontend is a Next.js static React application. The Go BFF serves the
static export and proxies FHIR requests. This map covers the frontend source
tree; the Go server lives outside `src/`.

# Directory Map

```
src/
├── app/                        Next.js App Router routes
│   ├── page.tsx                Root home (role dispatch)
│   ├── research/               Research hub
│   │   ├── page.tsx            /research route
│   │   ├── research-page.tsx   Participant or researcher home
│   │   ├── home/               Participant home sections
│   │   │   ├── home-intro.tsx
│   │   │   ├── up-next-section.tsx
│   │   │   ├── joined-study-card.tsx
│   │   │   ├── open-to-join.tsx
│   │   │   ├── findings-section.tsx
│   │   │   ├── guest-save-banner.tsx
│   │   │   ├── given-panel.tsx
│   │   │   ├── trust-strip.tsx
│   │   │   └── use-participant-home.ts
│   │   ├── researcher/         Researcher home sections
│   │   │   ├── researcher-intro.tsx
│   │   │   ├── next-step-card.tsx
│   │   │   ├── researcher-study-card.tsx
│   │   │   ├── given-back-list.tsx
│   │   │   └── finding-composer.tsx
│   │   ├── register/           Study creation form
│   │   └── edit/               Study edit form
│   ├── study/                  /study?id=X one study
│   │   ├── page.tsx
│   │   ├── study-view.tsx
│   │   ├── study-overview.tsx
│   │   ├── study-side-facts.tsx
│   │   ├── take-part-panel.tsx
│   │   ├── study-not-found.tsx
│   │   └── study-facts.ts
│   ├── studies/                /studies catalogue
│   │   ├── page.tsx
│   │   └── studies-view.tsx
│   ├── report/                 /report?id=X participation report
│   │   ├── report-fab.tsx
│   │   ├── report-save-card.tsx
│   │   └── report-view.tsx
│   └── ...                     auth, schedule, record, journal, profile
├── components/                 Shared UI, page header, FAB, drawers
├── context/                    Auth, FAB and runtime providers
├── hooks/                      Shared hooks (claim, share, records)
├── i18n/                       Translation lookup
├── messages/                   en/ and id/ JSON with identical keys
├── services/api/               React Query hooks and FHIR fetchers
│   ├── research.tsx
│   ├── research-study.ts
│   ├── research-catalogue.ts
│   ├── research-findings.ts
│   └── researcher.tsx
└── utils/                      Pure helpers
    └── fhir/                   FHIR parsing and research extensions
        ├── research.ts
        ├── research-bundle.ts
        ├── research-schedule.ts
        ├── research-status.ts
        ├── research-catalogue-order.ts
        ├── findings-feed.ts
        └── study-profile.ts
```

# Key Files

| Path                            | Purpose                       |
| ------------------------------- | ----------------------------- |
| `@/AGENTS.md`                   | Root agent instructions       |
| `@/docs/agents/ARCHITECTURE.md` | System architecture reference |
| `@/docs/ADR/*.md`               | Architecture decision records |
| `@/docs/wiki/*.md`              | Current architecture notes    |

# Conventions

- Route files stay thin; page logic lives in `*-view.tsx` or hooks
- Research data reads go through `services/api/`, parsing through `utils/fhir/`
- Components stay under 300 lines; split into folders when they grow
- `messages/en` and `messages/id` keep identical key sets, no dotted keys
- One `h1` per page; filters are buttons with `aria-pressed`
