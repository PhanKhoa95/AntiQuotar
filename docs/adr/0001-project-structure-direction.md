# ADR 0001: Project Structure Direction

Date: 2026-06-25
Status: Accepted

## Context

AntiQuotar currently centers on `AntiQuotar.bat`, a Windows batch console that coordinates three upstream Antigravity-related projects and writes local diagnostics.

The repo needs a structure that supports implementation without confusing owned code, generated output, upstream clones, and reference research.

## Decision

- Keep `AntiQuotar.bat` as the root launcher.
- Treat `tools/` as ignored operational upstream clones.
- Treat `reports/` as ignored generated diagnostics.
- Use `src/workflows/` for future owned implementation modules.
- Use `tests/` for deterministic validation.
- Use `configs/` for safe config examples.
- Use `.matrix/reference-code/` for read-only reference clones that are not part of the runtime.

## Consequences

- Implementation can proceed incrementally without breaking the current launcher.
- Upstream projects stay isolated from owned AntiQuotar code.
- Generated reports and cloned repos stay out of git.
- A future migration away from batch requires a new ADR.
