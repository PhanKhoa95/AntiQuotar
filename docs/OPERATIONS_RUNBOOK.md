# Operations Runbook

Project: AntiQuotar
Runtime: local Windows console

## Quy trình vận hành tối thiểu

1. Run `AntiQuotar.bat check`.
2. Run `AntiQuotar.bat sync` when upstream tools need to be prepared or updated.
3. Run `AntiQuotar.bat quota` or use the `usage` submenu for quota checks.
4. Run `AntiQuotar.bat probe` to check the LS gateway.
5. Run `AntiQuotar.bat health` to capture a diagnostic report.

## Tín hiệu cần theo dõi

- Required dependencies missing from `check`.
- Upstream repos failing to clone or fast-forward.
- `antigravity-usage` missing globally and `npx` unavailable.
- LS gateway probe failing on the configured port.
- Health reports showing repeated upstream command failures.

## Common Issues

| Symptom | Likely Cause | Action |
| --- | --- | --- |
| `git` missing | Git not installed or not on PATH | Install Git or update PATH |
| `npx` missing | Node.js/npm not installed | Install Node.js 18+ |
| `cargo` missing | Rust toolchain absent | Install Rust or use LS release app path |
| LS probe fails | Gateway not running or different port | Start LS or update configured port |
| Watcher build fails | Upstream dependency or npm issue | Run sync and inspect upstream build output |

## Local Data

- `tools/` can be recloned by running sync.
- `reports/` can be deleted when diagnostics are no longer needed.
- `.matrix/reference-code/repos/` is for research clones and can be rebuilt from `INDEX.md`.

## Incident Rule

Preserve the latest health report before making fixes. Do not delete user-created files or upstream clone changes unless the user asks.

## Handoff cho Codex

- Keep operational fixes local and reversible.
- Add tests around recurring failures before changing workflow behavior.
- Update this runbook when adding new commands or external dependencies.
