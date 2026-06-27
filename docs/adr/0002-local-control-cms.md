# ADR 0002: Local Control CMS

Date: 2026-06-25
Status: Accepted

## Context

AntiQuotar needs a faster way to manage user-provided cookie sessions, monitor quota state, and rotate to a healthy session without interrupting coding.

Reading cookies directly from Chrome profiles would cross a sensitive credential boundary. The safer implementation is a local-only CMS where the user deliberately pastes or imports cookie data.

## Decision

- Add a React + Vite Control CMS at the project root.
- Keep `AntiQuotar.bat` as the launcher and add `cms` / `control` commands.
- Store CMS state in browser `localStorage`.
- Support manual cookie paste from header string, Netscape, and JSON formats.
- Mask stored cookie values in the UI.
- Track quota, limit, cooldown, active session, rotation queue, import/export, and local logs.
- Do not scrape Chrome profiles or automatically read browser cookie stores.

## Consequences

- The app is runnable with `npm run dev` or `AntiQuotar.bat cms`.
- Cookie management is user-driven and local.
- Live quota integration still needs a future local bridge if browser-only checks are not enough.
- Any bridge that handles cookies or account state needs another ADR before implementation.
