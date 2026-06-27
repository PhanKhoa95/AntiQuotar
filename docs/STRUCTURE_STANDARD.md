# Structure Standard

Use this standard before adding files or moving implementation code.

## Root

- Keep `AntiQuotar.bat` as the root launcher.
- Keep root files limited to project metadata, launcher entry points, README, handoff, and git config.
- Do not place generated reports, cloned repos, or temporary files at the root.

## Owned Source

- Put new owned implementation modules under `src/`.
- Put workflow-specific scripts under `src/workflows/`.
- Keep modules small enough to test independently.
- Do not mix upstream source code into `src/`.

## Config

- Put public config examples in `configs/`.
- Do not commit private machine config, tokens, OAuth data, or account material.
- Keep `configs/automation.example.json` synchronized with any loader implementation.

## Docs

- Keep architecture decisions in `docs/adr/`.
- Keep workflow behavior in `docs/AUTOMATION_PLAN.md`.
- Keep implementation ownership in `docs/MODULE_MAP.md`.
- Update `MATRIX_HANDOFF.md` when next tasks change.

## Tests

- Put deterministic tests under `tests/`.
- Prefer smoke tests for command routing and path behavior before deeper workflow tests.
- Mock external commands where possible.

## Ignored Local State

- `tools/` contains operational upstream clones and stays out of git.
- `reports/` contains generated diagnostics and stays out of git.
- `.matrix/reference-code/repos/` contains read-only reference clones and stays out of git.
