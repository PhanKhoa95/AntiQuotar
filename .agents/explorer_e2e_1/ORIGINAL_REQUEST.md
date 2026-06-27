## 2026-06-26T07:22:05Z
Analyze the frontend source code of AntiQuotar in `src/App.tsx`. Investigate the following features and detail how they are implemented, their UI representation (HTML elements, classes, IDs, placeholder text, buttons, etc.), and how to interact with them in E2E tests:
1. Cookie Inbox import: support for Header, Netscape, and JSON formats. Locate the input/textarea field, import button, validation/import success/error feedback.
2. Rotation mechanism: Manual rotation and Auto-rotation based on threshold. Locate manual rotate button, threshold slider/input, current active session, and rotation logic.
3. Queue ordering & Cooldown management: sorting order, cooldown trigger, auto-expiry. Locate cooldown button, cooldown state display, queue ordering rules.
4. LS Gateway sync & State Persistence: Run Check API sync, connection warning logging, localStorage reload. Locate run check button, gateway URL input, LS connection status display, localStorage behavior.

Produce a detailed report `handoff.md` in your working directory `.agents/explorer_e2e_1/` detailing your findings and recommended selectors for Playwright tests.
