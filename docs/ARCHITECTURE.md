# Architecture

AntiQuotar is a local orchestration wrapper around existing Antigravity-related tools plus a browser-based Control CMS for cookie-session and quota rotation management.

## Boundaries

- Owned: launcher behavior, menu routing, local workflow composition, Control CMS UI, local session/quota state, config shape, validation, reports, and docs.
- Referenced: upstream repos cloned into `tools/`.
- Generated: health reports and diagnostics under `reports/`.
- Research-only: external reference repos under `.matrix/reference-code/repos/`.

## Runtime Shape

The current launcher runtime is `cmd.exe` through `AntiQuotar.bat`.

The Control CMS runtime is React + Vite and runs locally at `http://127.0.0.1:5173`.

Future implementation can add owned PowerShell or Node.js workflow modules under `src/workflows/`, but the batch entry point should remain the compatibility layer until an ADR changes that decision.

## Integration Points

- `git` clones and updates upstream repos.
- `npm` and `npx` install or run `antigravity-usage`.
- `cargo` runs Antigravity Tools LS from source when available.
- `curl.exe` probes the local LS endpoint.
- IDE CLIs can install the built watcher VSIX when the user chooses one.
- Browser `localStorage` stores CMS session state when the user chooses to save cookie data locally.

## Data Flow

1. User launches `AntiQuotar.bat`.
2. The launcher resolves the workspace root and configured directories.
3. A command or menu action runs one local workflow.
4. The workflow calls upstream tools or local system commands.
5. Results are printed to the console and, for diagnostics, written to `reports/`.

Control CMS flow:

1. User opens `AntiQuotar.bat cms` or `npm run dev`.
2. The app loads local session state from browser `localStorage`.
3. User pastes cookie strings manually from Chrome DevTools or an export.
4. The app parses and stores session metadata, quota values, cooldowns, and logs.
5. User rotates to a healthy session from the local queue.

## Non-Goals

- No autonomous background runner.
- No MCP server or dashboard owned by this repo.
- No API-key manager.
- No automatic Chrome profile scraping.
- No production deployment layer.
- No direct edits to upstream clones unless explicitly requested.
