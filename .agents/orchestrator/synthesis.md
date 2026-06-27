# Synthesis - Core Features Refinement (Milestone 1)

This document aggregates the recommendations from the Explorer agents to implement the refinements for Milestone 1.

## Consensus
All Explorer agents agree on the core logic structure to be added to `src/App.tsx`:
1. **React Auto-rotation Reactivity**: A new `useEffect` that monitors `activeSession`, `sessions`, and `settings` state. If the active session's quota usage percentage exceeds the `rotateThreshold` or its status is "cooldown", it automatically rotates to the best candidate session (Healthy/Watch status, lowest usage).
2. **LS Gateway Integration**: Re-write `runCheck` to fetch the LS Gateway endpoint, parse the JSON, and map values (`quotaUsed`, `quotaLimit`, `cooldownUntil`) to update local session states. If connection fails, log a warning block instead of throwing/crashing.
3. **Cooldown Ticker**: A new `useEffect` hook running on a `setInterval` ticker (every 10s or 1s) to force UI re-renders for countdowns and actively check and expire cooldown states by setting `cooldownUntil` to `null` once the time has passed.

## Code Changes Outline
The worker will apply the following edits to `src/App.tsx`:
- Add `cooldownTick` state to trigger updates.
- Implement the React Auto-rotation effect.
- Implement the Cooldown Management effect.
- Rewrite `runCheck` to perform asynchronous fetching and state mapping.
- Update `normalizedSessions` and `rotationQueue` dependency arrays to include `cooldownTick`.
