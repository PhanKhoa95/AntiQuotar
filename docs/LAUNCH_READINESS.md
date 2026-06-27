# Launch Readiness

Project: AntiQuotar
Target: local Windows console tool
Revenue model: not commercialized

## Launch Meaning

For AntiQuotar, launch means the local tool can be handed to a user on the same machine or repo without surprising side effects. It does not mean public web deployment.

## Điều kiện tối thiểu để online

AntiQuotar is not an online app. For this project, these are the equivalent local handoff gates.

| Gate | Requirement | Status |
| --- | --- | --- |
| Structure | MATRIX `validate-project` passes | done |
| Quality | MATRIX `quality-gate` has no blocking errors | done |
| Dependencies | `AntiQuotar.bat check` runs and reports missing optional tools clearly | done |
| Safety | Risky actions prompt before install, build, service start, and VSIX install | done |
| Reports | Health reports are written under ignored `reports/` | done |
| Upstreams | Clones live under ignored `tools/` | done |
| Tests | Command smoke tests exist | todo |
| Docs | README and handoff describe real commands and boundaries | done |

## Not In Scope

- Public hosting.
- Domain, SSL, or cloud deployment.
- User accounts or payment.
- Production monitoring.

## Go/No-Go trước launch

- Go for implementation planning: structure validators and quality gate pass.
- No-go for release handoff: smoke tests do not exist yet.
- No-go for public distribution: packaging, license review, and support policy are not done.

## Handoff cho Codex

- Add smoke tests before changing behavior.
- Keep launch docs focused on local operation unless the user asks for public distribution.
