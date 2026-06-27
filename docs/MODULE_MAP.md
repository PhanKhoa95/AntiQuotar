# Module Map

This map defines ownership before implementation begins.

## Current Module

- `AntiQuotar.bat`
  - Owns command routing, menu rendering, path setup, prompts, and orchestration.
  - Should remain stable while logic is gradually extracted.
- `src/App.tsx`
  - Owns the Control CMS state model, cookie parsing, quota tracking, rotation queue, import/export, and local logs.
- `src/styles.css`
  - Owns the Control CMS visual system and responsive layout.
- `package.json`
  - Owns React/Vite scripts for `dev`, `build`, and `preview`.

## Planned Owned Modules

- `src/workflows/dependencies.*`
  - Dependency detection and readable check output.
- `src/workflows/upstreams.*`
  - Clone, update, and status checks for upstream repos.
- `src/workflows/usage.*`
  - `antigravity-usage` command resolution and invocation.
- `src/workflows/ls.*`
  - LS source start, release install handoff, and local probe.
- `src/workflows/watcher.*`
  - VSIX build discovery and install handoff.
- `src/workflows/reports.*`
  - Timestamped report paths and diagnostic collection.
- `src/workflows/config.*`
  - Config loading and validation based on `configs/automation.example.json`.
- `src/workflows/control-bridge.*`
  - Future optional bridge between the CMS and CLI workflows. Must not expose secrets or read Chrome profiles automatically.

## External Modules

- `tools/Antigravity-Tools-LS`
  - Upstream LS gateway and dashboard source.
- `tools/antigravity-usage`
  - Upstream quota CLI.
- `tools/AntigravityQuotaWatcher`
  - Upstream IDE extension source.

## Test Ownership

- `tests/command-routing.*`
  - Help, unknown command, and menu-safe routing.
- `tests/path-resolution.*`
  - Root, tools, reports, and upstream path construction.
- `tests/reporting.*`
  - Report file naming and generated sections.
