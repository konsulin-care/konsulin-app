---
name: implement
description: Executes a plan file. Triggered when user says "implement @path/to/plan.md".
---

# Implement Skill — Task Lifecycle

Use this skill when user says "implement @path/to/plan.md".

## 1. Read Plan

- Read the referenced plan file (e.g., `@docs/plans/001-feature.md`).
- Understand all work packages, goals, and UAT criteria.

## 2. Create @TODO.md

- Copy `@docs/templates/TODO.md` to `@TODO.md` at project root.
- Map each WP from the plan to a `## WP-N:` section.
- Add checklist items under each WP.

## 3. Execute Tasks

- Work on tasks sequentially within each WP.
- After each task completion:
  - Update `@TODO.md` checkbox (`[x]`).
  - Run tests; fix any failures immediately.
- Move to next task only after current one passes tests.

## 4. Auto-Test

- Run full test suite.
- Fix all failures before proceeding to UAT.

## 5. Guide UAT

- Walk through each step in the plan's UAT section.
- Have the user verify behavior.
- Fix any issues found.

## 6. Archive

- Move plan: `mv docs/plans/NNN-name.md docs/plans/.archive/NNN-name.md`
- Archive TODO: `mv TODO.md docs/plans/.archive/TODO-NNN-name.md`
