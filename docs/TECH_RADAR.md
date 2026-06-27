# Technology Radar

Use this file before changing AntiQuotar's implementation technology.

## Adopt

- Windows batch launcher: current compatibility entry point.
- PowerShell command execution: already required for local workflows and Windows diagnostics.
- Git, Node.js, npm, npx, curl: existing dependency surface.
- React + Vite: local Control CMS runtime.
- Browser localStorage: local-only CMS session persistence.

## Trial

- PowerShell modules under `src/workflows/` for maintainable local automation.
- Pester or a small Node-based smoke harness for deterministic tests.
- JSON config loading from `configs/automation.example.json`.
- Local bridge process for live quota checks, only if it can keep cookies and credentials isolated.

## Assess

- Node.js CLI wrapper if workflow logic becomes cross-platform.
- Lightweight TUI only if the current menu becomes too hard to maintain.

## Hold

- Autonomous background runners.
- MCP servers.
- API-key or account credential management.
- Automatic Chrome profile scraping.
- Production dashboards owned by this repo.
- CI/CD setup until the test harness exists and the user asks for it.
