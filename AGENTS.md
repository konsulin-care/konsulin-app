---
title: Agentic Documentation
description: Single source of truth and the root reference for an AI agent
---

## Hallucination Prevention (CRITICAL)

- CHECK actual source: do NOT invent function names, types, or APIs
- GREP existing patterns before adding dependencies or conventions
- RUN tests after every change: fix failures immediately
- When unsure, READ the codebase: do NOT guess
- If a simpler approach exists, use it: no over-engineering

## Operating Procedures

- Write tests alongside code: test behavior, not implementation
- Keep functions under 50 lines unless justified
- Use explicit error handling: no silent catches or `throw Error`
- Type everything explicitly: avoid `any` and inferred `as` casts
- Prefer readability over cleverness: one-liners are not goals
- Document relative path from the project root: `@/path/to/file.txt`
- Any directory named .archive/ at any depth MUST be ignored by all agentic tools
- Follow the Concise skill for all output: no flattery, no hedging, short sentences, direct answers

## Nested AGENTS.md Files

Subdirectories may contain their own AGENTS.md with scope-specific instructions.

- PRECEDENCE: The AGENTS.md closest to the file being edited takes priority
- INHERITANCE: Nested files supplement, not replace, this root file

## Step 0: Project Initialization

If `@docs/agents/` is empty or missing, the project has not been
initialized. Before any other lifecycle step:

1. Read `@.agents/skills/init/SKILL.md`
2. Follow the interactive init skill to finalize all agent documentation
3. After completion, all `docs/agents/*.md` will be project-specific

## Architecture Decision Records (ADRs)

- Before architecture changes: READ `@docs/agents/ARCHITECTURE.md` for existing decisions
- New decisions: Create ADR at `@docs/ADR/NNN-title.md` (3-digit enum, <5 word title)
- Format: YAML frontmatter (title, description, status, date) + H1 sections (Context, Decision, Impact): use template at `@docs/templates/ADR.md`
- After creating ADR: Update ARCHITECTURE.md to reference it with `@docs/ADR/NNN-title.md`

## Available Skills

| Skill      | Trigger                                        | Description                           |
| ---------- | ---------------------------------------------- | ------------------------------------- |
| init       | `docs/agents/` is empty or not yet initialized | `@.agents/skills/init/SKILL.md`       |
| brainstorm | Starting a new feature or change plan          | `@.agents/skills/brainstorm/SKILL.md` |
| implement  | User says "implement @path/to/plan.md"         | `@.agents/skills/implement/SKILL.md`  |
| concise    | Always active for all output                   | `@.agents/skills/concise/SKILL.md`    |

## Documentation Limits

- Apply to all documentations in `.md`, `.mdx`, `.qmd` format.
- The limit is 100 lines per document. Split to focused sub-documents if needed. Prefer short sentences over long, complex ones.
- Hierarchical reference: only documents in the higher directory may refer the subdirectories

## Reference

- Code conventions: READ `@docs/agents/STANDARDS.md`
- Common mistakes to avoid: READ `@docs/agents/KNOWN_PITFALLS.md`
- Full directory map: READ `@docs/agents/PROJECT_STRUCTURE.md`
- System design and decisions: READ `@docs/agents/ARCHITECTURE.md`
- Document templates: READ `@docs/templates/`
