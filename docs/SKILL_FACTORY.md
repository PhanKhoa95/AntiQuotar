# Skill Factory

Project: AntiQuotar

## When To Create A Project Skill

Create a project-local Codex skill only when AntiQuotar gains a repeatable workflow that Codex should run the same way every time.

Good candidates:

- Auditing command safety before release.
- Updating upstream integration docs.
- Running a deterministic local validation suite.

Poor candidates:

- One-off implementation tasks.
- Broad "help with AntiQuotar" instructions.
- Anything that belongs in README or `MATRIX_HANDOFF.md`.

## Skill Requirements

- Clear frontmatter name and description.
- Specific trigger.
- Inputs to read before acting.
- Step-by-step workflow.
- Boundaries and prohibited actions.
- Validation commands or checklist.
- Output format with results and remaining risk.

## Current Decision

No project-local skill is required before the first implementation pass. Use MATRIX specialist skills instead:

- `matrix-project-finalizer`
- `matrix-implementation-planner`
- `matrix-test-strategy-planner`
- `matrix-docs-handoff-writer`
