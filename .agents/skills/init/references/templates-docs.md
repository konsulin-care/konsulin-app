# Doc Generation Templates — docs/agents/\*.md

Loaded during Phase 4c. Use `docs/templates/` as structural base.
Overlay answers from Phases 2-3 onto these archetype templates.

## 1. ARCHITECTURE.md

Fill tech stack table from Phase 2 interview answers.

**Data analysis archetype:**

- Tech stack: Python, [pixi/uv], [Quarto/Marimo/Jupyter], [pandas/polars], [plotly/matplotlib]
- Data flow: Notebook → Analysis → Report/Output
- Key patterns: Data validation at ingestion, idempotent transformations, explicit I/O boundaries

**Web API archetype:**

- Tech stack: [Node/Go/Rust], [Express/FastAPI/gin], [REST/GraphQL], [Postgres/MySQL/SQLite], [Prisma/Drizzle]
- Data flow: Client → Router → Middleware → Controller → Service → DB
- Key patterns: Middleware pipeline, repository pattern, error boundary per layer

**CLI archetype:**

- Tech stack: [Node/Go/Python], [commander/cobra/click], [JSON/YAML/TOML] config
- Data flow: Args → Parse → Validate → Execute → Output
- Key patterns: Command dispatch, config merging, structured output

**Fullstack archetype:**

- Tech stack: [Next.js/React], [turborepo/nx], [Prisma/Drizzle], [tRPC/REST]
- Data flow: Client → API Layer → Service → DB
- Key patterns: Shared validation layer, server components, API routes

## 2. STANDARDS.md

Start from `docs/templates/` (or existing `docs/agents/STANDARDS.md` generic content).
Add framework-specific conventions from this table:

| Archetype      | Standards to add                                                                          |
| -------------- | ----------------------------------------------------------------------------------------- |
| Data analysis  | PEP 8, type hints, docstrings (NumPy/Google), notebook numbering, data naming             |
| Python general | PEP 8, type hints, `__init__.py` exports, virtual env isolation                           |
| Web API        | Route naming (plural RESTful), status code usage, middleware order, error response format |
| Fullstack      | Component naming, server vs client directives, data fetching patterns                     |
| CLI            | Command naming (verb-noun), exit codes, --help format                                     |
| Library        | Public API surface, semver, barrel exports, deprecation policy                            |

## 3. KNOWN_PITFALLS.md

Start from existing `docs/agents/KNOWN_PITFALLS.md`. Add archetype-specific:

| Archetype     | Pitfalls to add                                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Data analysis | Out-of-order execution in notebooks, mutating while iterating, silent `SettingWithCopyWarning`, memory from loading all data |
| Python        | Mutable default args, `is` vs `==`, circular imports, bare `except:`                                                         |
| Web API       | N+1 queries, no input validation, leaking stack traces, missing CORS                                                         |
| Fullstack     | Over-fetching in RSC, stale cache, hydration mismatch                                                                        |
| CLI           | Ignoring stderr for pipes, huge output unbuffered, missing `--help`                                                          |
| Database      | Missing indexes, N+1 in ORM, no migration rollback plan                                                                      |

## 4. PROJECT_STRUCTURE.md

Start from existing `docs/agents/PROJECT_STRUCTURE.md`. Adjust for archetype:

| Archetype     | Directory changes                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------- |
| Data analysis | `notebooks/`, `data/` (raw, processed), `reports/`, `src/` (py modules), remove `infra/`, `config/` |
| Web API       | `src/routes/`, `src/controllers/`, `src/middleware/`, `src/services/`, `src/validators/`            |
| CLI           | `src/commands/`, `src/config/`, no `infra/`                                                         |
| Fullstack     | `apps/web/`, `apps/api/`, `packages/shared/`, turbo.json                                            |
| Library       | `src/` (barrel export), no `config/`, no `infra/`                                                   |
