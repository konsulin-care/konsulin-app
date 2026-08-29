---
title: Agentic Documentation [scope]
description: Scope-specific agent instructions with template references
---

## Purpose

This AGENTS.md covers the [subdirectory] scope. It inherits from and
supplements the parent AGENTS.md — parent rules take precedence unless
this file explicitly overrides them.

## Templates

Copy templates from `@docs/templates/` when creating new documentation:

| Template               | Use when creating...                            |
| ---------------------- | ----------------------------------------------- |
| `AGENTS.md`            | Subdirectory agent instruction files            |
| `000-plan.md`          | Feature or change plans under `docs/plans/`     |
| `ADR.md`               | Architecture decision records under `docs/ADR/` |
| `ARCHITECTURE.md`      | System architecture overviews                   |
| `PROJECT_STRUCTURE.md` | Project directory maps                          |
| `TODO.md`              | Task trackers derived from a plan               |

## Documentation Limits

- All agent-facing docs (AGENTS.md, plans, TODO.md, STANDARDS.md, etc.)
  must not exceed 100 lines per file. Split into focused sub-documents.
- Any directory named `.archive/` at any depth must be ignored by agents.
  Do not read, load, summarize, or reference archived content.

## Conventions

- Internal links use the `@` prefix: `@docs/templates/AGENTS.md`
- Most markdown files require YAML frontmatter (`title`, `description`,
  plus type-specific fields). Exception: `TODO.md` has no frontmatter.
- Prefer short sentences and imperative tone. No emojis in agent docs.
