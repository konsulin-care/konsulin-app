---
name: init
description: One-time interactive project initialization — detects config, interviews user, generates docs/agents/*.md and ADRs
---

# Init Skill — Project Architecture Brainstorm

Use this when `@docs/agents/` is empty or not yet initialized.

## Phase 1 — Auto-detect

Run `@.agents/skills/init/scripts/detect.sh`, parse results, and present
as user-confirmable defaults.

Ask user: "These are my auto-detected defaults — confirm or override each?"

## Phase 2 — Structured Interview (two-way)

Ask all 5 core questions. Present 2-3 options with tradeoffs per question. For conditional triggers, load tradeoffs from `@.agents/skills/init/references/tradeoffs.md` verbatim.

**Core questions (always):**

1. Project name — used as title in generated docs
2. One-line description — YAML frontmatter description
3. Project type — Web API / CLI tool / Library / Fullstack app / Mobile backend / Data analysis / Other
4. Runtime — Node.js / Deno / Bun / Python / Go / Rust / Other
5. Language — TypeScript / JavaScript / Python / Go / Rust / Other

**Conditional triggers** — after core answers, branch on:

| Trigger              | Load tradeoffs for                                            |
| -------------------- | ------------------------------------------------------------- |
| Type = Data analysis | Notebook env, viz lib, data libs, output format               |
| Language = Python    | Env manager, testing, linter                                  |
| Type = Web API       | API style, auth, OpenAPI                                      |
| Type = Fullstack     | Monorepo tool, shared validation                              |
| Type = CLI tool      | Args parser, config files, output format                      |
| Database chosen      | ORM, migrations, pooling                                      |
| CI/CD chosen         | Platform                                                      |
| Framework = Next.js  | App vs Pages Router, rendering                                |
| Runtime chosen       | Runtime version manager (mise/fnm/nvm/volta/pyenv/gvm/rustup) |

After each decision, ask the user if they have follow-up questions before moving to the next.

## Phase 3 — Open Q&A

Ask user: "Do you have any questions about the architecture we've outlined?" Answer using established project profile. If answers lead to new architecture decisions, note them for ADR.

## Phase 4a — Propose ADR TODO

Load the ADR proposal table from `@.agents/skills/init/references/templates-adr.md`. Select ADRs relevant to the project's archetype from Phase 2-3 answers.

Present as a bullet list with title and one-line contents:

```
- 001: Project Architecture — runtime, language, framework, testing, CI/CD
- 002: Database & ORM Choice — engine, ORM, migration strategy
```

Ask user: "Here is my proposed list of architecture decisions to document. Should I add, remove, rename, or modify any entry?"

If user requests changes, update the proposal and re-confirm. Repeat until user explicitly approves. Do not proceed to Phase 4b without approval.

## Phase 4b — Draft ADR Files

For each confirmed ADR in the TODO list:

1. Copy `@docs/templates/ADR.md`
2. Fill YAML frontmatter (title, description, status: accepted, date: today)
3. Fill Context, Decision, Impact sections using Phase 2-3 answers
4. Keep each ADR under 100 lines
5. Reference related ADRs in the Decision section (e.g., "See ADR-002 for database rationale")

## Phase 4c — Generate docs/agents/\*.md

For each output file, load the corresponding section from `@.agents/skills/init/references/templates-docs.md`:

1. `docs/agents/ARCHITECTURE.md` — tech stack, data flow, design principles, key patterns
2. `docs/agents/STANDARDS.md` — generic + framework-specific conventions
3. `docs/agents/KNOWN_PITFALLS.md` — generic + stack-specific pitfalls
4. `docs/agents/PROJECT_STRUCTURE.md` — project-specific directory tree

Use `docs/templates/` as base and overlay answers from Phase 2-3. Keep each file under 100 lines. After all files are created, update ARCHITECTURE.md's "Architecture Decisions" section to reference every ADR created in Phase 4b.

## Phase 5 — Self-cleanup

1. `mv .agents/skills/init docs/plans/.archive/init-skill/`
2. Remove or comment out "Step 0: Project Initialization" from root `AGENTS.md`
3. The `.archive/` directory is excluded from agent tools — init runs only once
