# Plan - AntiQuotar Core Features & Playwright Tests

This plan details the implementation and verification of core features and automated tests.

## Milestone 1: Core Feature Refinements (R1)
1. **Auto-Rotation Reactivity**: Implement a reactive auto-rotation mechanism in `src/App.tsx` using a React `useEffect` hook, ensuring that when the active session exceeds the configured quota threshold, it auto-rotates to a healthy/watch session with the lowest quota usage.
2. **LS Gateway Integration**: Update the "Run Check" function in `src/App.tsx` to fetch the LS Gateway endpoint, parse the response, and synchronize the active session or matching sessions' quota data.
3. **Cooldown & Queue Order**: Keep the cooldown status updated dynamically (using an interval timer to refresh remaining minutes) and ensure the queue sorting logic matches the priority (Healthy/Ready first, Cooldown last).

## Milestone 2: Playwright E2E Tests Setup & Scenarios (R2)
1. **Playwright Installation & Config**: Initialize Playwright in the project, create `playwright.config.ts`, and place E2E tests in a new `tests/` directory.
2. **Cookie Inbox Formats**: Write tests verifying session addition via Cookie Inbox with Header string, Netscape, and JSON formats.
3. **Manual & Auto-Rotation**: Write tests verifying manual rotation (Rotate Now) and auto-rotation (Run Check / auto trigger).
4. **Queue Ordering**: Write tests verifying correct queue prioritization.
5. **Accessibility / HTML Validation**: Write tests ensuring no duplicate HTML IDs or unlinked labels.

## Milestone 3: Build & Verification
1. Run `npm run build` to verify there are no TypeScript or compilation errors.
2. Run `npx playwright test` to verify all tests pass.
3. Perform Forensic Audit to check code integrity.
