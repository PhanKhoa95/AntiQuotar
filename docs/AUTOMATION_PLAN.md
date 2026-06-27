# Automation Plan

AntiQuotar automates local Antigravity quota and LS workflows while keeping upstream project code isolated.

## Workflow Map

- Dependency check: verify Git, Node.js, npm, npx, PowerShell, curl, and optional local tools.
- Upstream sync: clone or fast-forward update the three upstream repos under `tools/`.
- Usage adapter: resolve `antigravity-usage` globally or through `npx`, then run quota, doctor, status, account, and login commands.
- LS adapter: start Antigravity Tools LS from source and probe the local `/v1/provision/status` endpoint.
- Watcher builder: package the Quota Watcher VSIX from its upstream clone and optionally install it through an IDE CLI.
- Health report: write timestamped diagnostics to `reports/`.
- Resonance flow: run sync, dependency check, usage doctor, quota, LS probe, optional LS start, and health report in one guided sequence.
- Control CMS: run a local React/Vite panel for manual cookie intake, quota state, cooldowns, quick rotation, import/export, and local logs.

## Safety Rules

- Prompt before install, build, VSIX install, browser open, or background service start.
- Keep generated reports out of git.
- Keep upstream clones out of git.
- Do not write API keys, account tokens, OAuth data, or machine credentials into configs or docs.
- Do not scrape Chrome profiles or browser cookie stores automatically.
- Keep raw cookies visible only as masked values in the UI.
- Prefer dry-run support for future non-interactive workflows.

## Implementation Direction

- Keep `AntiQuotar.bat` as the stable user-facing launcher.
- Keep the Control CMS local-only until a new ADR approves any backend bridge.
- Move new owned logic into `src/workflows/` instead of expanding the batch file indefinitely.
- Treat `configs/automation.example.json` as the public config contract.
- Put deterministic smoke tests under `tests/` before making behavior changes.
