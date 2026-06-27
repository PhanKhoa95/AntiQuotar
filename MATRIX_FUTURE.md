# MATRIX Future Structure

Project: AntiQuotar
Profile: generic automation tool
Horizon: 12 months

## Future Intent

AntiQuotar should remain a safe local orchestration console for Antigravity quota and LS workflows. The structure should support small, testable implementation steps while keeping upstream repos, generated reports, and reference code separate.

## Growth Principles

- Preserve `AntiQuotar.bat` as the stable launcher until an ADR approves a replacement.
- Move new owned logic into `src/workflows/`.
- Keep user-facing workflow behavior documented in `docs/AUTOMATION_PLAN.md`.
- Add smoke tests before changing command behavior.
- Keep upstream clones in `tools/` and out of git.
- Keep reference-only clones in `.matrix/reference-code/repos/` and out of git.
- Do not add a background service, dashboard, MCP server, or credential manager without a new ADR.

## 12 Month Shape

- A stable launcher remains at the repo root.
- Workflow modules exist under `src/workflows/`.
- Tests cover command routing, path resolution, config parsing, reporting, and safe prompts.
- Config examples stay in `configs/` with no secrets.
- Docs stay current enough for Codex to implement without guessing boundaries.

## Codex Next

- Implement the first workflow extraction only after the smoke test shape is chosen.
- Update `docs/ROADMAP.md` and `docs/MODULE_MAP.md` when module names become real files.
- Create a new ADR before switching from batch-first orchestration.
