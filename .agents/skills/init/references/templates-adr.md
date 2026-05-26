# ADR Proposals — for Phase 4a TODO

Select ADRs relevant to the project's archetype. Present all selected
ADRs to the user for approval before drafting. Iterate on the list
until user confirms.

## ADR reference table

| ADR | Title                          | Contents                                                                                            | Archetypes                 |
| --- | ------------------------------ | --------------------------------------------------------------------------------------------------- | -------------------------- |
| 001 | Project Architecture           | Runtime, language, framework, testing, CI/CD — broadest decisions                                   | All                        |
| 002 | Database & ORM Choice          | Engine (Postgres/MySQL/SQLite), ORM (Prisma/Drizzle/SQLAlchemy), migration strategy, pooling        | Web API, Fullstack         |
| 003 | API Design                     | Protocol (REST/GraphQL/tRPC), auth strategy, response format, versioning                            | Web API, Fullstack, Mobile |
| 004 | Environment & Tooling          | Package manager, linter, formatter, task runner, monorepo config                                    | All non-trivial            |
| 005 | Authentication & Authorization | JWT vs sessions vs OAuth, token storage, refresh flow, RBAC                                         | Web API, Fullstack, Mobile |
| 006 | CI/CD & Deployment             | Platform (Vercel/Railway/Coolify/k8s/AWS), deploy strategy, env promotion, branch policy            | All with CI                |
| 007 | Data Processing Pipeline       | Notebook env (Quarto/Marimo/Jupyter), output format (reports/dashboards/API), idempotent transforms | Data analysis              |

## Archetype selection guide

| Archetype      | Include ADRs                    |
| -------------- | ------------------------------- |
| Web API        | 001, 002, 003, 005, (006 if CI) |
| Data analysis  | 001, 004, 007                   |
| CLI tool       | 001, (004 if complex)           |
| Fullstack      | 001, 002, 003, 005, (006 if CI) |
| Library        | 001, 004                        |
| Mobile backend | 001, 002, 003, 005              |

## ADR authoring rules

- Title: ≤5 words, matches filename
- Status: `accepted` (decisions already made during Phase 2)
- Context: "New [project type] project using [runtime] + [framework]. Needed to decide [decision area]."
- Decision: chosen option + one-line rationale. List alternatives considered.
- Impact: tradeoffs — what becomes easier or harder because of this decision
