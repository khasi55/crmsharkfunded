import sys
import os

# Mock the environment to load mock worker
os.environ["MT5_HOST"] = "mock"
os.environ["MT5_LOGIN"] = "123"

# Add path to find modules
sys.path.append(os.getcwd())

try:
    from mt5_worker import MT5Worker
    
    print("Initializing Worker...")
    worker = MT5Worker()
    worker.connect()
    
    # Test 1: Mock Manager Mode (Should Success)
    print("\n--- TEST 1: Mock Manager Mode ---")
    # Force manager mock
    worker._manager = worker._create_manager_mock()
    res = worker.adjust_balance(12345, 500, "Test Deposit")
    print(f"Result: {res}")
    
    if "success" in str(res):
        print("✅ Test 1 Passed")
    else:
        print("❌ Test 1 Failed")

    # Test 2: Client Mode (Should Fail Gracefully)
    print("\n--- TEST 2: Client Mode (No Manager) ---")
    worker._manager = None
    worker._use_client_api = True
    res = worker.adjust_balance(12345, 500, "Test Deposit")
    print(f"Result: {res}")
    
    if "error" in res and "Manager API required" in res["error"]:
        print("✅ Test 2 Passed (Graceful Error)")
    elif "error" in res:
         print(f"✅ Test 2 Passed (Error returned: {res['error']})")
    else:
        print("❌ Test 2 Failed (Expected Error)")

except Exception as e:
    print(f"❌ Verification Logic Crash: {e}")
    import traceback
    traceback.print_exc()
