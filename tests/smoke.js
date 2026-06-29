import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const batPath = path.join(rootDir, "AntiQuotar.bat");

function runCmd(args) {
  return new Promise((resolve) => {
    exec(`"${batPath}" ${args}`, { cwd: rootDir }, (error, stdout, stderr) => {
      resolve({
        code: error ? error.code : 0,
        stdout,
        stderr
      });
    });
  });
}

async function runTests() {
  console.log("Running AntiQuotar.bat smoke tests...");
  let passed = true;

  // Test 1: Help command
  console.log("- Testing: AntiQuotar.bat help");
  const resHelp = await runCmd("help");
  if (resHelp.code === 0 && resHelp.stdout.includes("Usage:")) {
    console.log("  [PASS] Help command works.");
  } else {
    console.error("  [FAIL] Help command failed:", resHelp);
    passed = false;
  }

  // Test 2: Check command
  console.log("- Testing: AntiQuotar.bat check");
  const resCheck = await runCmd("check");
  if (resCheck.code === 0 && resCheck.stdout.includes("Core dependencies:")) {
    console.log("  [PASS] Check command works.");
  } else {
    console.error("  [FAIL] Check command failed:", resCheck);
    passed = false;
  }

  // Test 3: Unknown command
  console.log("- Testing: AntiQuotar.bat invalid-command-xyz");
  const resInvalid = await runCmd("invalid-command-xyz");
  if (resInvalid.code === 1 && resInvalid.stdout.includes("Unknown command: invalid-command-xyz")) {
    console.log("  [PASS] Unknown command handled correctly.");
  } else {
    console.error("  [FAIL] Unknown command handling failed:", resInvalid);
    passed = false;
  }

  if (passed) {
    console.log("\nALL SMOKE TESTS PASSED!");
    process.exit(0);
  } else {
    console.error("\nSOME SMOKE TESTS FAILED!");
    process.exit(1);
  }
}

runTests();
