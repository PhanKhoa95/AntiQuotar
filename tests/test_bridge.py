# tests/test_bridge.py
import urllib.request
import urllib.error
import json
import sys

BRIDGE_URL = "http://127.0.0.1:5189/v1/accounts"

print("Running Python Bridge validation tests...")

# Test 1: Verify OPTIONS preflight request
print("- Test 1: OPTIONS request CORS headers...")
req_options = urllib.request.Request(BRIDGE_URL, method="OPTIONS")
req_options.add_header("Origin", "http://127.0.0.1:5173")
try:
    with urllib.request.urlopen(req_options, timeout=5) as resp:
        headers = resp.info()
        assert resp.status == 204, f"Expected 204, got {resp.status}"
        assert headers.get("Access-Control-Allow-Origin") == "http://127.0.0.1:5173", f"CORS origin mismatch: {headers.get('Access-Control-Allow-Origin')}"
        assert "GET" in headers.get("Access-Control-Allow-Methods", ""), "Missing GET in allowed methods"
        print("  [PASS] OPTIONS CORS handling works perfectly.")
except Exception as e:
    print(f"  [FAIL] OPTIONS test failed: {e}")
    sys.exit(1)

# Test 2: Verify GET request gateway forwarding (supports both 200 Online and 503 Offline)
print("- Test 2: GET request gateway forwarding...")
req_get = urllib.request.Request(BRIDGE_URL, method="GET")
req_get.add_header("Origin", "http://127.0.0.1:5173")
try:
    with urllib.request.urlopen(req_get, timeout=5) as resp:
        assert resp.status == 200, f"Expected 200 when online, got {resp.status}"
        body = resp.read().decode("utf-8")
        data = json.loads(body)
        assert "sessions" in data or isinstance(data, list), "Invalid response structure"
        print("  [PASS] Gateway is ONLINE. Accounts list fetched successfully.")
except urllib.error.HTTPError as e:
    if e.code == 503:
        headers = e.headers
        assert headers.get("Access-Control-Allow-Origin") == "http://127.0.0.1:5173", "Missing CORS origin in 503 header"
        body = e.read().decode("utf-8")
        data = json.loads(body)
        assert data.get("error") == "LS Gateway unreachable", f"Expected error description, got: {data}"
        print("  [PASS] Gateway is OFFLINE. 503 error forwarded correctly.")
    else:
        print(f"  [FAIL] Unexpected HTTP error code: {e.code}")
        sys.exit(1)
except Exception as e:
    print(f"  [FAIL] GET test failed: {e}")
    sys.exit(1)

print("\nALL PYTHON BRIDGE VALIDATION TESTS PASSED SUCCESSFULLY!")
sys.exit(0)
