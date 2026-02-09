import os
import traceback
import requests
from datetime import datetime
from mt5_worker import MT5Worker, MT5Manager

# Load .env file if present
try:
    from dotenv import load_dotenv
    # Try current dir
    if not load_dotenv():
        # Try parent dir
        parent_env = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
        if os.path.exists(parent_env):
            print(f"📄 Loading .env from: {parent_env}")
            load_dotenv(parent_env)
        else:
            print("⚠️ .env file not found in current or parent directory.")
except ImportError:
    pass # python-dotenv might not be installed


# Initialize Supabase
try:
    from supabase import create_client, Client
    SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    if SUPABASE_URL and SUPABASE_KEY:
        print(f"🔹 Initializing Supabase: {SUPABASE_URL[:15]}...")
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    else:
        print("⚠️ Missing SUPABASE_URL or SUPABASE_KEY env vars.")
        supabase = None
except ImportError:
    print("⚠️ Supabase library not found. Running with Envs only.")
    supabase = None

# --- CONFIGURATION ---
SHARK_BRIDGE_URL = os.getenv("SHARK_BRIDGE_URL", "http://localhost:5001")
last_synced_tickets = {}

def load_server_config():
    """Fetches MT5 Manager Credentials from Supabase and sets ENVs"""
    if not supabase: return
    try:
        response = supabase.table('mt5_server_config').select("*").order('updated_at', desc=True).limit(1).execute()
        if response.data:
            config = response.data[0]
            print(f"⚙️ Loaded Dynamic Config: {config.get('server_ip')}:{config.get('api_port')}")
            # Inject into Environment for MT5Worker to pick up
            os.environ["MT5_HOST"] = str(config.get("server_ip"))
            os.environ["MT5_LOGIN"] = str(config.get("manager_login"))
            os.environ["MT5_PASSWORD"] = str(config.get("manager_password"))
            os.environ["MT5_PORT"] = str(config.get("api_port"))
            
            # Inject Poller Config
            if config.get("callback_url"):
                 os.environ["CRM_TRADE_CALLBACK"] = str(config.get("callback_url"))
            
            if config.get("monitored_groups"):
                 groups = config.get("monitored_groups")
                 if isinstance(groups, list):
                      import json
                      os.environ["TRADE_GROUPS"] = json.dumps(groups)
                 else:
                      os.environ["TRADE_GROUPS"] = str(groups)

    except Exception as e:
        print(f"⚠️ Failed to load dynamic config: {e}")

# --- HELPER: Random Password Generator ---
def generate_password(length=10):
    chars = string.ascii_letters + string.digits + "!@#$"
    return ''.join(random.choice(chars) for _ in range(length))

def log_system_event(level, message, details=None):
    """Logs data to Supabase system_logs table"""
    if not supabase: return
    try:
        payload = {
            "source": "PythonBridge",
            "level": level, # INFO, WARN, ERROR
            "message": message,
            "details": details,
            "created_at": datetime.utcnow().isoformat()
        }
        supabase.table("system_logs").insert(payload).execute()
    except Exception as e:
        print(f"⚠️ Failed to log to DB: {e}")


# --- WORKER SETUP ---
connected = False
worker = None

def init_worker():
    global worker
    load_server_config() # <--- LOAD FROM DB BEFORE CONNECT
    log_system_event("INFO", "Bridge Service Starting...")
    
    try:
        # DEBUG: Inspect MTRequest and DealerSend
        # print(f"🔎 MTRequest DIR: {[x for x in dir(MT5Manager.MTRequest) if not x.startswith('_')]}")
        worker = MT5Worker()
        if not worker.connected:
            worker.connect()
        
        if not worker.connected:
            print("❌ API Server: Failed to connect to MT5 Manager")
    except ImportError:
        print("❌ mt5_worker module not found. Running in Mock Mode.")
        # Mock Worker for local development without MT5
        class MockMT5Worker:
            connected = False
            def connect(self):
                print("MockMT5Worker: connect called (no-op)")
                self.connected = True
            def create_account(self, first, last, group, leverage, balance, callback_url):
                print(f"MockMT5Worker: create_account called for {first} {last}")
                return {"login": 12345, "password": "mock_password", "investor_password": "mock_investor_password"}
            @property
            def manager(self):
                class MockManager:
                    def DealerBalance(self, login, amount, comment):
                        print(f"MockMT5Worker: DealerBalance called for {login}, amount {amount}")
                return MockManager()
            def get_deals(self, login, from_time, to_time):
                # print(f"MockMT5Worker: get_deals called for {login}")
                return []
            def get_positions(self, login):
                # print(f"MockMT5Worker: get_positions called for {login}")
                return []
        worker = MockMT5Worker()

# Initialize on import
init_worker()

# --- RISK MONITOR: STOP OUT LOGIC ---

failed_accounts = set()

def is_failed(login):
    return login in failed_accounts

def mark_failed(login):
    failed_accounts.add(login)


# ---------------- CORE STOP-OUT ACTIONS ----------------
def disable_account(user):
    print(f"ACTION: Disabling user {user.Login}...")
    log_system_event("WARN", f"Disabling Account {user.Login} (Risk Breach)")
    
    # Method 1: Set Enable = 0 (Standard disable)
    if hasattr(user, "Enable"):
        user.Enable = 0
    
    # Method 2: Create "Read Only" mode by removing Rights (Optional, might require higher perms)
    if hasattr(user, "Rights"):
        user.Rights = 0 # USER_RIGHT_NONE

    try:
        # Attempt update
        result = worker.manager.UserUpdate(user)
        
        if result == 0 or result is True:
             print(f"SUCCESS: UserUpdate call returned success for {user.Login}.")
             log_system_event("INFO", f"Account {user.Login} DISABLED Successfully")
             
             # VERIFICATION: Re-fetch user to see if it stuck
             updated_user = worker.manager.UserRequest(user.Login)
             if updated_user:
                 print(f"VERIFY: Post-Update Enable: {getattr(updated_user, 'Enable', 'N/A')}")
                 print(f"VERIFY: Post-Update Rights: {getattr(updated_user, 'Rights', 'N/A')}")
                 # print(f"VERIFY: Post-Update Comment: {getattr(updated_user, 'Comment', 'N/A')}")
                 
             return True
        
        print(f"ERROR: UserUpdate failed for {user.Login}. Check Manager Permissions.")
        
        if hasattr(worker.manager, "GetLastError"):
             code = worker.manager.GetLastError()
             print(f"MT5 Error Code: {code}")
             log_system_event("ERROR", f"Disable Failed for {user.Login}", {"error_code": code})
             
        return False

    except Exception as e:
        print(f"EXCEPTION: UserUpdate failed: {e}")
        return False


def force_close_positions(login: int) -> int:
    """
    Force close positions. 
    Attempts Native DealerClose. 
    Falls back to Delete+Balance if Native fails (Safety Net).
    """
    print(f"📉 force_close_positions({login}) triggered...")
    
    # DEBUG: See what methods we ACTUALLY have
    try:
        print(f"🔎 DEBUG Manager Methods: {[mx for mx in dir(worker.manager) if 'Request' in mx or 'Close' in mx or 'Delete' in mx]}")
    except: pass

    positions = worker.manager.PositionRequest(login) or []
    closed = 0

    for pos in positions:
        ticket = 0
        try:
             # Handle different object structures (Struct vs Object)
             ticket = getattr(pos, "Position", getattr(pos, "Ticket", 0))
        except: pass

        if ticket == 0:
             continue

        native_success = False

        # --- ATTEMPT 1: NATIVE CLOSE ---
        try:
            req = None
            res = None
            
            # Helper to safely create objects
            if hasattr(worker.manager, "CreateRequest"):
                req = worker.manager.CreateRequest()
            elif hasattr(MT5Manager, "MTRequest"):
                req = MT5Manager.MTRequest()
                
            if hasattr(worker.manager, "CreateConfirm"):
                res = worker.manager.CreateConfirm()
            elif hasattr(MT5Manager, "MTConfirm"):
                res = MT5Manager.MTConfirm()

            if req and res:
                req.Action = MT5Manager.MTRequest.EnTradeActions.TA_DEALER_CLOSE
                req.Login = login
                req.Position = ticket
                req.Symbol = getattr(pos, "Symbol", "")
                req.Volume = getattr(pos, "Volume", 0)
                req.Price = 0.0 # Market

                if worker.manager.DealerSend(req, res):
                    if res.ResultRetcode in (MT5Manager.EnMTAPIRetcode.MT_RET_OK, MT5Manager.EnMTAPIRetcode.MT_RET_REQUEST_DONE):
                        print(f"   ✅ Native Close Success: #{ticket}")
                        native_success = True
                        closed += 1
                    else:
                        print(f"   ⚠️ Native Close Rejected: {res.ResultRetcode}")
            else:
                print("   ⚠️ Failed to create Request objects.")

        except Exception as e:
            print(f"   ⚠️ Native Close Exception: {e}")

        # --- ATTEMPT 2: FALLBACK DELETE (Safety Net) ---
        if not native_success:
            # If native failed, we MUST delete to stop the loss.
            # User prefers Close, but Delete is better than Crash.
            print(f"   🔄 Attempting Fallback Delete for #{ticket}...")
            try:
                # Calculate PnL for restoration
                pnl = float(getattr(pos, 'Profit', 0.0)) + float(getattr(pos, 'Storage', 0.0)) + float(getattr(pos, 'Commission', 0.0))
                
                deleted = False
                if hasattr(worker.manager, "PositionDelete"):
                    # Some bindings take ticket, some take object
                    try:
                        if worker.manager.PositionDelete(ticket): deleted = True
                    except:
                        if worker.manager.PositionDelete(pos): deleted = True
                
                if deleted:
                    print(f"   ✅ Fallback Delete Success: #{ticket}")
                    if abs(pnl) > 0.01:
                        # Fix Balance
                        # Check DealerBalance signature if possible, defaulting to standard
                        try:
                            # Try standard 4-arg signature
                            worker.manager.DealerBalance(login, pnl, 2, f"Fix #{ticket}")
                            print(f"   💸 Balance Fixed: {pnl}")
                        except:
                            print(f"   ❌ Failed to Fix Balance")
                    closed += 1
                else:
                    print(f"   ❌ CRITICAL: Fallback Delete Failed for #{ticket}")
                    
            except Exception as e:
                print(f"   ❌ Fallback Error: {e}")

    return closed


def force_close_orders(login: int):
    """
    Force delete/close all PENDING ORDERS for a login.
    Uses TA_STOPOUT_ORDER (or OrderDelete fallback).
    """
    deleted_orders = 0
    try:
        if hasattr(worker.manager, "OrderRequest"):
             orders = worker.manager.OrderRequest(login) or []
             if orders:
                 print(f"   ℹ️ Found {len(orders)} Pending Orders for {login}")
                 
             for order in orders:
                 ticket = order.Order
                 success = False
                 
                 # STRATEGY 1: NATIVE STOP OUT ORDER (TA_STOPOUT_ORDER)
                 if hasattr(MT5Manager, "MTRequest"):
                     try:
                         req = MT5Manager.MTRequest()
                         if req:
                             res = MT5Manager.MTConfirm()
                             req.Action = MT5Manager.MTRequest.EnTradeActions.TA_STOPOUT_ORDER
                             req.Login = login
                             req.Order = ticket
                             
                             if worker.manager.DealerSend(req, res):
                                 if res.ResultRetcode in [MT5Manager.EnMTAPIRetcode.MT_RET_OK, MT5Manager.EnMTAPIRetcode.MT_RET_REQUEST_DONE]:
                                     print(f"   ✅ Native Order StopOut Success: {ticket}")
                                     success = True
                                 else:
                                     print(f"   ⚠️ DealerSend Order Failed: {res.ResultRetcode}")
                     except:
                         pass
                 
                 # STRATEGY 2: FALLBACK DELETE (OrderDelete)
                 if not success and hasattr(worker.manager, "OrderDelete"):
                      try:
                          worker.manager.OrderDelete(ticket)
                          print(f"   🗑️ Order Deleted (Fallback): {ticket}")
                          success = True
                      except Exception as e:
                          print(f"   ❌ Order Delete Failed: {e}")
                 
                 if success:
                     deleted_orders += 1
    except Exception as e:
        print(f"❌ OrderRequest failed: {e}")
        
    return deleted_orders
