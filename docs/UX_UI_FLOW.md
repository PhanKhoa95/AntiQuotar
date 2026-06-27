# UX/UI Flow

Project: AntiQuotar
Interface: Windows console menu and local Control CMS
Audience: local Windows operator
Primary goal: check Antigravity quota and local LS health safely
Entry point: `AntiQuotar.bat`

## Flow Type

AntiQuotar has a console UI and a local browser CMS. The CMS is for manually pasted cookie sessions, quota monitoring, cooldown control, rotation queue management, and local import/export.

## Luong chinh

AntiQuotar has a console flow rather than a visual app flow.

## Luồng chính

1. User opens `AntiQuotar.bat`.
2. The menu shows workspace root, tools directory, and LS port.
3. User chooses one action from the numbered menu.
4. Risky actions ask for confirmation before install, build, service start, browser open, or VSIX install.
5. The command prints clear success, warning, or error output.
6. The menu returns unless the user exits.

Control CMS flow:

1. User opens `AntiQuotar.bat cms`.
2. The app loads saved local sessions.
3. User pastes a cookie string copied from Chrome DevTools or a cookie export.
4. User sets domain, name, quota used, and quota limit.
5. User adds the session to the local queue.
6. User runs a local check or rotates to the healthiest session.

## Bản đồ màn hình

| Surface | Purpose | Primary action | Required states |
| --- | --- | --- | --- |
| Main menu | Pick a local workflow | Select numbered action | ready, invalid choice, exit |
| Usage submenu | Run quota/account commands | Select usage action | ready, command failed, back |
| Confirmation prompt | Guard risky operations | Confirm or skip | accepted, skipped |
| Command output | Show result of workflow | Read result and continue | success, warning, error |
| Health report | Persist diagnostics | Open or reference report path | written, failed |
| Control CMS | Manage cookie sessions and quota rotation | Add Cookie, Run Check, Rotate Now | ready, warning, error, saved |

## Direct Command Flow

- `help` shows commands and upstream roles.
- `check` reports required and optional dependencies.
- `sync` prepares upstream repos.
- `usage` opens the usage submenu.
- `quota` prints quota information through `antigravity-usage`.
- `ls` starts the LS gateway from source.
- `probe` checks the local LS gateway endpoint.
- `watcher` builds/packages the watcher extension.
- `health` writes a diagnostic report.
- `resonate` runs the combined guided flow.

## Trạng thái UI bắt buộc

- Ready: command can run with available dependencies.
- Missing dependency: command names the missing tool and next action.
- Confirmation required: user must opt in before risky work.
- External failure: upstream command failed and exit code is preserved.
- Report written: health report path is printed.
- CMS saved: session state is saved to browser localStorage.
- Rotation ready: a healthy or watch session is available.
- Rotation blocked: no healthy candidate exists.

## Frontend Hold

If a graphical UI is requested later, update this document before implementation with screens, navigation, loading states, error states, and responsive behavior.

## Handoff cho Codex

- Keep the console menu direct and task-focused.
- Keep the graphical UI local-only.
- Preserve confirmation prompts before risky actions.
- Update this document before adding new menu surfaces or UI states.
