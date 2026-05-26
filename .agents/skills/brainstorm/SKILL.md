---
name: brainstorm
description: Starting a new feature or change plan. Breaks requirements into work packages and writes plan files.
---

# Brainstorm Skill — Plan Lifecycle

Use this skill when starting a new feature or change.

## 1. Brainstorm

- Ask the user what they want to achieve.
- List known constraints (tech stack, timeline, dependencies).
- Note any existing patterns in the codebase.

## 2. Clarify Features

- For each vague requirement, ask 1-2 clarifying questions.
- Confirm scope boundaries — what is IN and what is OUT.
- Document tradeoffs and propose options.

## 3. Formulate Work Packages

- Break features into atomic, buildable steps.
- Each WP must be self-contained and testable.
- Order WPs by dependency — no circular or blocked-first.
- Keep WPs small enough to complete in a single session.

## 4. Write Plan File

- Copy `@docs/templates/000-plan.md` to `@docs/plans/NNN-plan-name.md` for each WP.
- Fill frontmatter: title, description, date
- Write Overview, Goals, Implementation Steps, Risks, UAT.
- Present to user for approval.
