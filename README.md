# AntiQuotar

AntiQuotar is a local Windows orchestration console and Control CMS for Antigravity quota, usage, LS gateway, cookie-session tracking, and quota rotation workflows.

The project owns the orchestration layer only. Upstream projects are cloned into `tools/` for local use, reports are written into `reports/`, and future implementation work should stay inside the documented boundaries below.

## Commands

Run `AntiQuotar.bat` to open the interactive menu.

Direct commands:

- `AntiQuotar.bat help` - show command help.
- `AntiQuotar.bat check` - check local dependencies.
- `AntiQuotar.bat sync` - clone or update upstream repos.
- `AntiQuotar.bat usage` - open the antigravity-usage submenu.
- `AntiQuotar.bat quota` - run `antigravity-usage quota --all`.
- `AntiQuotar.bat cms` - open the local AntiQuotar Control CMS.
- `AntiQuotar.bat control` - alias for the local Control CMS.
- `AntiQuotar.bat ls` - start Antigravity Tools LS from source.
- `AntiQuotar.bat probe` - check the local LS gateway.
- `AntiQuotar.bat watcher` - build/package the Quota Watcher VSIX.
- `AntiQuotar.bat health` - write a local health report.
- `AntiQuotar.bat resonate` - run the combined sync, doctor, quota, probe, and report flow.

Frontend commands:

```powershell
npm install
npm run dev
npm run build
```

The CMS runs locally at `http://127.0.0.1:5173` by default.

## Control CMS

The Control CMS is a React/Vite local dashboard for:

- Manually pasting cookies copied by the user from Chrome DevTools or a cookie export.
- Parsing header-string, Netscape, and JSON cookie formats.
- Storing session metadata and optional raw cookie strings in browser `localStorage`.
- Tracking quota usage, limits, cooldown, and active session state.
- Rotating quickly to a healthy session before quota exhaustion interrupts coding.
- Exporting and importing the local control state as JSON.

AntiQuotar does not scrape Chrome profiles and does not read browser cookie storage automatically.

## Project Structure

- `AntiQuotar.bat` - current owned entry point and interactive menu.
- `configs/automation.example.json` - safe default config shape for future implementation.
- `docs/` - architecture, structure, roadmap, and MATRIX handoff references.
- `src/App.tsx` and `src/styles.css` - local Control CMS implementation.
- `src/workflows/` - reserved for owned workflow modules when the batch script is split into smaller units.
- `tests/` - reserved for deterministic validation of command behavior.
- `tools/` - ignored operational clones of upstream projects.
- `reports/` - ignored generated health reports and diagnostics.
- `.matrix/reference-code/` - read-only reference clone workspace for implementation research.

## Validation

Before implementation changes are called ready, run:

```powershell
AntiQuotar.bat check
AntiQuotar.bat health
npm run build
python "C:\Users\KHOA MEDIA\.codex\plugins\cache\local-matrix-marketplace\matrix\1.5.0\scripts\matrix_project_finalizer.py" quality-gate --workspace . --profile generic --template automation-tool
```

Use `MATRIX_HANDOFF.md` as the current implementation checklist.
