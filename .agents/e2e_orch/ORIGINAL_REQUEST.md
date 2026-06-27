# Original User Request

## Initial Request — 2026-06-26T14:21:26+07:00

You are the E2E Testing Orchestrator. Your working directory is c:\Users\KHOA MEDIA\Documents\AntiQuotar\.agents\e2e_orch.
Please design and create a comprehensive Playwright E2E test suite for AntiQuotar running at http://127.0.0.1:5173/.

1. Follow the Test Case Design Methodology (4-tier approach).
2. Group the features into 4 core areas (N = 4):
   - Feature 1: Cookie Inbox import (Header, Netscape, JSON formats)
   - Feature 2: Rotation mechanism (Manual and Auto-rotation based on threshold)
   - Feature 3: Queue ordering & Cooldown management (sorting order, cooldown trigger, and auto-expiry)
   - Feature 4: LS Gateway sync & State Persistence (Run Check API sync, connection warning logging, localStorage reload)
3. Target the minimum thresholds for N = 4:
   - Tier 1: Feature Coverage (>=20 test cases)
   - Tier 2: Boundary & Corner Cases (>=20 test cases)
   - Tier 3: Cross-Feature Combinations (>=4 test cases)
   - Tier 4: Real-World Scenarios (>=5 test cases)
   - Total: >=49 test cases. You can use parameterized tests (e.g. test.describe or test.forEach) in Playwright to efficiently achieve this count.
4. Steps:
   - Create tests/ directory and place all test code there.
   - Configure playwright.config.ts at root.
   - Write TEST_INFRA.md at the project root detailing your test cases, feature inventory, methodology, and setup.
   - When all tests are created and ready, publish TEST_READY.md at the project root with the test runner commands.
   - Verify that you can run playwright tests (or run them via a worker).
5. Report completion to f6e7b7c0-6c47-409e-b1c6-5fffa85550a5 (orchestrator).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
