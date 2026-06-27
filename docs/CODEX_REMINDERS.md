# Codex Reminders

Before editing AntiQuotar implementation:

- Read `MATRIX_HANDOFF.md`.
- Read `docs/AUTOMATION_PLAN.md`, `docs/ARCHITECTURE.md`, `docs/STRUCTURE_STANDARD.md`, and `docs/UX_UI_FLOW.md`.
- Read `docs/LAUNCH_READINESS.md`, `docs/COMMERCIAL_READINESS.md`, and `docs/OPERATIONS_RUNBOOK.md` before calling the project ready for handoff or release.
- Keep `AntiQuotar.bat` as the stable user-facing launcher unless a new ADR changes that.
- Do not commit `tools/`, `reports/`, or `.matrix/reference-code/repos/`.
- Do not write secrets, tokens, OAuth files, or machine-specific credentials.
- Do not edit upstream clones under `tools/` unless the user explicitly asks.
- Update `configs/automation.example.json` when the config contract changes.
- Add or update tests for command routing, paths, and reports before changing behavior.
- Run MATRIX `validate-project` and `quality-gate` before saying the structure is ready.
