# Roadmap

## Phase 0 - Structure

- Finalize project structure.
- Document workflow boundaries.
- Add MATRIX handoff and quality gates.

## Phase 1 - Batch Hardening

- Keep current command behavior stable.
- Add safer error handling for missing upstream tools.
- Make report paths and LS port configurable.
- Add Control CMS launcher path.

## Phase 2 - Modular Workflows

- Extract repeated logic from `AntiQuotar.bat` into owned workflow modules.
- Add dry-run support for non-interactive workflows.
- Add config validation.
- Add an optional local bridge for live quota reads only after security boundaries are reviewed.

## Phase 3 - Validation Suite

- Add deterministic tests for paths, commands, reports, and safe prompts.
- Add a single local validation command.
- Document known external dependency assumptions.
- Add browser-oriented validation for the Control CMS when testing scope is approved.

## Phase 4 - Optional UX and Distribution

- Evaluate whether a richer UI, installer, or package format is worth adding.
- Create a new ADR before adding a long-running service, dashboard, or deployment path.
