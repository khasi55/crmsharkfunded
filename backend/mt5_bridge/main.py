import random
import string
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import List, Dict
import traceback
import subprocess
import os
import json
import requests

# Webhook Config for CRM
CRM_WEBHOOK_URL = os.environ.get("CRM_WEBHOOK_URL", "https://api.sharkfunded.co/api/webhooks/mt5")
MT5_WEBHOOK_SECRET = os.environ.get("MT5_WEBHOOK_SECRET", "")

app = FastAPI()

# --- WEBSOCKET MANAGER (SCALABLE) ---
class ConnectionManager:
    def __init__(self):
        # login -> list or set of WebSockets
        self.rooms: Dict[int, List[WebSocket]] = {}
        self.main_loop = None

    async def connect(self, login: int, websocket: WebSocket):
        await websocket.accept()
        if login not in self.rooms:
            self.rooms[login] = []
        self.rooms[login].append(websocket)
        print(f"📡 WS: Client connected to room {login}. Total in room: {len(self.rooms[login])}")

    def disconnect(self, login: int, websocket: WebSocket):
        if login in self.rooms:
            if websocket in self.rooms[login]:
                self.rooms[login].remove(websocket)
            if not self.rooms[login]:
                del self.rooms[login]
        print(f"📡 WS: Client disconnected from room {login}")

    async def broadcast(self, login: int, message: dict):
        """
        Sends to:
        1. Specific login room
        2. Master room (login 0)
        """
        # Lazy Check: If no one is listening to this login or the master stream, skip.
        has_login_clients = login in self.rooms and self.rooms[login]
        has_master_clients = 0 in self.rooms and self.rooms[0]

        if not has_login_clients and not has_master_clients:
            return

        targets = []
        if has_login_clients:
            targets.extend(self.rooms[login])
        if has_master_clients:
            targets.extend(self.rooms[0])

        # Remove duplicates if a client is in both (though unlikely in this design)
        targets = list(set(targets))

        for connection in targets:
            try:
                await connection.send_json(message)
            except Exception as e:
                # Disconnect will handle cleanup
                pass

    def broadcast_threadsafe(self, login: int, message: dict):
        if getattr(self, 'main_loop', None):
            import asyncio
            try:
                asyncio.run_coroutine_threadsafe(self.broadcast(login, message), self.main_loop)
            except Exception:
                pass


ws_manager = ConnectionManager()

@app.on_event("startup")
async def startup_event():
    import asyncio
    ws_manager.main_loop = asyncio.get_running_loop()
    print("✅ Asyncio loop attached to WS Manager.")

@app.websocket("/ws/stream/{login}")
async def websocket_endpoint(websocket: WebSocket, login: int):
    await ws_manager.connect(login, websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(login, websocket)
    except Exception as e:
        print(f"⚠️ WS: Error ({login}): {e}")
        ws_manager.disconnect(login, websocket)

# In-memory cache to track last sync per account (for polling optimization)
last_synced_tickets = {}

# --- HELPER: Random Password Generator ---
def generate_password(length=10):
    chars = string.ascii_letters + string.digits + "!@#$"
    return ''.join(random.choice(chars) for _ in range(length))

# --- SUPABASE CONFIG LOADING ---
supabase = None
try:
    from supabase import create_client, Client
    # Load envs implicitly or directly
    from dotenv import load_dotenv
    load_dotenv()
    
    SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    if SUPABASE_URL and SUPABASE_KEY:
        print(f"🔹 Initializing Supabase: {SUPABASE_URL[:15]}...")
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    else:
        print("⚠️ Missing SUPABASE_URL or SUPABASE_KEY. Using Envs only.")
except ImportError:
    print("⚠️ Supabase library not found. Using Envs only.")

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
            
            # Inject Poller Config (Custom ENVs for other scripts)
            if config.get("callback_url"):
                 os.environ["CRM_TRADE_CALLBACK"] = str(config.get("callback_url"))
            
            if config.get("monitored_groups"):
                 groups = config.get("monitored_groups")
                 if isinstance(groups, list):
                      os.environ["TRADE_GROUPS"] = json.dumps(groups)
                 else:
                      os.environ["TRADE_GROUPS"] = str(groups)

    except Exception as e:
        print(f"⚠️ Failed to load dynamic config: {e}")

# Load Config BEFORE Worker Import/Init if possible, or just before Connect
load_server_config()

# --- WORKER SETUP ---
try:
    from mt5_worker import MT5Worker, MT5Manager
    
    # DEBUG: Inspect MTRequest and DealerSend
    # print(f"🔎 MTRequest DIR: {[x for x in dir(MT5Manager.MTRequest) if not x.startswith('_')]}")
    
    worker = MT5Worker() 
    if not worker.connected:
        worker.connect()

    if not worker.connected:
        print("❌ API Server: Failed to connect to MT5 Manager")
    else:
        # Start Dynamic Trade Poller
        try:
            from trade_poller import start_dynamic_polling
            start_dynamic_polling(worker, interval=10, reload_interval=300, ws_manager=ws_manager)
        except Exception as e:
            print(f"⚠️ Failed to start Trade Poller: {e}")

        # Start Risk Engine
        try:
            from risk_engine import RiskEngine
            # Pass Supabase client to RiskEngine (if available)
            risk_engine = RiskEngine(worker, supabase, ws_manager=ws_manager)
            risk_engine.start()
        except Exception as e:
             print(f"⚠️ Failed to start Risk Engine: {e}")

except ImportError:
    print("❌ mt5_worker module not found. Running in Mock Mode.")
    # Mock Worker for local development without MT5
    class MockMT5Worker:
        connected = False
        def connect(self):
            print("MockMT5Worker: connect called (no-op)")
            self.connected = True
        def disconnect(self):
            print("MockMT5Worker: disconnect (no-op)")
            self.connected = False
        def create_account(self, first, last, group, leverage, balance, callback_url):
            print(f"MockMT5Worker: create_account called for {first} {last}")
            return {"login": 12345, "password": "mock_password", "investor_password": "mock_investor_password"}
        @property
        def manager(self):
            class MockManager:
                def DealerBalance(self, login, amount, comment):
                    print(f"MockMT5Worker: DealerBalance called for {login}, amount {amount}")
                def UserAccountGet(self, login):
                    return None
                def UserRequest(self, login):
                    return None
            return MockManager()
        def get_deals(self, login, from_time, to_time):
            # print(f"MockMT5Worker: get_deals called for {login}")
            return []
        def get_positions(self, login):
            # print(f"MockMT5Worker: get_positions called for {login}")
            return []
    worker = MockMT5Worker()


@app.post("/reload-config")
def reload_config():
    """Reloads config from DB and reconnects Bridge"""
    print("🔄 Reloading Configuration...")
    load_server_config()
    
    try:
        if worker.connected:
            if hasattr(worker, 'disconnect'):
                worker.disconnect()
            worker.connected = False
        
        # Re-initialize or Re-connect
        # MT5Worker reads envs in __init__, so we might need new instance?
        # Let's see mt5_worker.py code again... it reads in __init__.
        # So we MUST re-create the worker.
        global worker
        # We need to re-import or just re-instantiate
        # Assuming MT5Worker class is available
        try:
             # Re-instantiate to pick up new Envs
             new_worker = MT5Worker()
             new_worker.connect()
             if new_worker.connected:
                 worker = new_worker # Atomically swap
                 print("✅ Bridge Reconnected with New Config")
                 return {"status": "success", "message": "Bridge Reconnected"}
             else:
                 print("❌ Bridge Reconnection Failed")
                 return {"status": "error", "message": "Failed to connect with new config"}
        except Exception as re:
             print(f"❌ Re-init failed: {re}")
             return {"status": "error", "message": str(re)}

    except Exception as e:
        return {"status": "error", "message": str(e)}


class AccountRequest(BaseModel):
    name: str
    email: str
    group: str
    leverage: int = 100
    balance: float = 10000

@app.post("/create-account")
def create_account(data: AccountRequest):
    if not worker.connected: 
        worker.connect()
    
    # Split name into first and last
    name_parts = data.name.strip().split(' ', 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else "Trader"
    
    # Use the worker's existing create_account method
    try:
        result = worker.create_account(
            first=first_name,
            last=last_name,
            group=data.group,
            leverage=data.leverage,
            balance=data.balance
        )
        
        print(f"✅ Created Account: {result['login']}")
        
        # EXPLICIT DEPOSIT: Ensure balance is backed by a Deal
        if data.balance > 0:
            print(f"💰 Attempting to deposit {data.balance}...")
            try:
                if hasattr(worker.manager, "DealerBalance"):
                    # DealerBalance(login, amount, comment)
                    worker.manager.DealerBalance(result['login'], data.balance, "Initial Deposit")
                    print("   ✅ DealerBalance success")
                else:
                    print("   ⚠️ DealerBalance method missing")
            except Exception as e:
                print(f"   ❌ Deposit failed: {e}")

        return {
            "login": result["login"],
            "password": result["password"],
            "investor_password": result["investor_password"],
            "group": data.group
        }
    except Exception as e:
        print(f"❌ Account creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Account creation failed: {str(e)}")

class DepositRequest(BaseModel):
    login: int
    amount: float
    comment: str = "Manual Deposit"

@app.post("/deposit")
def deposit_funds(data: DepositRequest):
    if not worker.connected:
        worker.connect()
        
    print(f"💰 Manual Deposit Request: {data.amount} for {data.login}")
    
    try:
        # LIST ALL METHODS FOR DEBUGGING
        # print("DEBUG: Available methods:", dir(worker.manager))
        
        if hasattr(worker.manager, "DealerBalance"):
            worker.manager.DealerBalance(data.login, data.amount, data.comment)
            return {"status": "success", "message": f"Deposited {data.amount}"}
        else:
            print("❌ DealerBalance method missing!")
            print("DEBUG: Available methods:", [m for m in dir(worker.manager) if not m.startswith('_')])
            raise HTTPException(status_code=500, detail="DealerBalance method missing")
            
    except Exception as e:
        print(f"❌ Deposit Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- ROBUST FETCH TRADES ---
class FetchRequest(BaseModel):
    login: int
    incremental: bool = False  # If true, only return NEW trades since last sync

# Helper to safely get attributes (Global Scope)
def get_val(obj, *names, default=None):
    for name in names:
        if hasattr(obj, name): return getattr(obj, name)
    return default

@app.post("/fetch-trades")
def fetch_trades(data: FetchRequest):
    
    results = []
    current_tickets = set()

    # Fetch data
    # Fetch deals from a reasonable start time (e.g., 2020) to now
    from_time = int(datetime(2020, 1, 1).timestamp())
    to_time = int(datetime.now().timestamp()) + 86400 # +1 day just in case
    
    deals = worker.get_deals(data.login, from_time, to_time)
    trades = worker.get_positions(data.login)
    
    # Process CLOSED trades (Deals)
    # Group deals by PositionID to match IN (open) and OUT (close) deals
    position_deals = {}
    for d in deals:
        try:
            position_id = get_val(d, "PositionID", default=0)
            if position_id == 0:
                continue
            
            if position_id not in position_deals:
                position_deals[position_id] = {"in": None, "out": None}
            
            entry = get_val(d, "Entry", default=0)
            if entry == 0:  # IN deal (opening)
                position_deals[position_id]["in"] = d
            elif entry == 1:  # OUT deal (closing)
                position_deals[position_id]["out"] = d
        except Exception as e:
            print(f"⚠️ Error grouping deal: {e}")
            pass
    
    # Now process matched positions
    for position_id, deals_pair in position_deals.items():
        try:
            in_deal = deals_pair["in"]
            out_deal = deals_pair["out"]
            
            # Only process if we have the closing deal (OUT)
            if not out_deal:
                continue
            
            ticket = get_val(out_deal, "Deal", "Ticket", default=0)
            if ticket == 0:
                continue
            
            # Get open time from IN deal, or use OUT deal time if IN doesn't exist
            open_time = int(get_val(in_deal, "Time", default=0)) if in_deal else int(get_val(out_deal, "Time", default=0))
            close_time = int(get_val(out_deal, "Time", default=open_time))
            
            # Calculate duration in seconds
            duration = close_time - open_time if close_time > open_time else 0
            
            t = {
                "login": data.login,
                "ticket": ticket,
                "symbol": get_val(out_deal, "Symbol", "symbol", default=""),
                "type": int(get_val(out_deal, "Action", "Type", "type", default=0)),
                "entry": int(get_val(out_deal, "Entry", "entry", default=1)),
                "volume": float(get_val(out_deal, "Volume", "volume", default=0)),
                "price": float(get_val(in_deal, "Price", "price", default=0.0)) if in_deal else float(get_val(out_deal, "Price", "price", default=0.0)),
                "close_price": float(get_val(out_deal, "Price", "price", default=0.0)),
                "profit": float(get_val(out_deal, "Profit", "profit", default=0.0)),
                "commission": float(get_val(out_deal, "Commission", "commission", default=0.0)),
                "swap": float(get_val(out_deal, "Storage", "Swap", "swap", default=0.0)),
                "time": open_time,  # Open time from IN deal
                "close_time": close_time,  # Close time from OUT deal
                "duration": duration,  # Duration in seconds
                "is_closed": True
            }
            results.append(t)
            current_tickets.add(ticket)
        except Exception as e:
            print(f"⚠️ Error processing position {position_id}: {e}")
            pass
    
    # Process OPEN positions
    # print(f"🔎 DEBUG: Processing {len(trades)} open positions...")
    for d in trades:
        try:
            # For MTPosition, the ticket is often in 'Position' attribute
            ticket = get_val(d, "Position", "Ticket", "Deal", default=0)
            # print(f"   Processing Open Pos Ticket: {ticket}")
            
            if ticket == 0:
                print("   ⚠️ Skipping because Ticket is 0")
                continue
                
            open_time = int(get_val(d, "TimeCreate", "Time", default=0))
            
            t = {
                "login": data.login,
                "ticket": ticket,
                "symbol": get_val(d, "Symbol", "symbol", default=""),
                "type": int(get_val(d, "Action", "Type", "Cmd", "type", default=0)), # Open positions use Action
                "entry": int(get_val(d, "Entry", "entry", default=0)),
                "volume": float(get_val(d, "Volume", "volume", default=0)),
                "price": float(get_val(d, "PriceOpen", "Price", "price_open", "price", default=0.0)),
                "close_price": float(get_val(d, "PriceCurrent", "Price", "price_current", "price", default=0.0)), 
                "profit": float(get_val(d, "Profit", "profit", default=0.0)),
                "commission": float(get_val(d, "Commission", "commission", default=0.0)),
                "swap": float(get_val(d, "Storage", "Swap", "swap", default=0.0)),
                "time": open_time,  # Open time
                "close_time": None,  # No close time for open trades
                "duration": None,  # No duration for open trades yet
                "is_closed": False
            }
            results.append(t)
            current_tickets.add(ticket)
            # print(f"   ✅ Added Open Trade {ticket}")
        except Exception as e:
            print(f"⚠️ Error processing position: {e}")
            pass
    
    # Polling optimization: only return NEW trades if incremental mode
    if data.incremental and data.login in last_synced_tickets:
        previous_tickets = last_synced_tickets[data.login]
        new_tickets = current_tickets - previous_tickets
        results = [t for t in results if t["ticket"] in new_tickets]
        print(f"⚡ Incremental sync: {len(new_tickets)} new trades out of {len(current_tickets)} total for {data.login}")
    else:
        print(f"⚡ Full sync: sending {len(results)} trades for {data.login}")

    return {"trades": results}

class FetchBulkRequest(BaseModel):
    logins: List[int]
    incremental: bool = False

@app.post("/fetch-trades-bulk")
def fetch_trades_bulk(data: FetchBulkRequest):
    if not worker.connected:
        worker.connect()
    
    all_results = []
    print(f"🔄 Bulk Fetching trades for {len(data.logins)} accounts...")

    # Reuse the logic of fetch_trades but in a loop to save HTTP overhead
    # In future, if C++ API supports GroupRequest, use that.
    
    # Pre-calc times once
    from_time = int(datetime(2020, 1, 1).timestamp())
    to_time = int(datetime.now().timestamp()) + 86400 

    for login in data.logins:
        try:
            results = []
            
            # Fetch
            deals = worker.get_deals(login, from_time, to_time)
            open_pos = worker.get_positions(login)
            
            # --- PROCESS DEALS ---
            # Debug: Print first deal to understand structure
            if len(deals) > 0 and login == data.logins[0]:
                 d0 = deals[0]
                 print(f"🔎 DEBUG: Raw Deal Object Sample: {d0}")
                 print(f"   Has 'Commission': {hasattr(d0, 'Commission')}, 'commission': {hasattr(d0, 'commission')}")
                 print(f"   Has 'Profit': {hasattr(d0, 'Profit')}, 'profit': {hasattr(d0, 'profit')}")
                 print(f"   Has 'Price': {hasattr(d0, 'Price')}, 'price': {hasattr(d0, 'price')}")
                 if hasattr(d0, '_asdict'): print(f"   As Dict: {d0._asdict()}")

            position_deals = {}
            for d in deals:
                try:
                    pid = get_val(d, "PositionID", default=0)
                    if pid == 0: continue
                    if pid not in position_deals: position_deals[pid] = {"in":None, "out":None}
                    entry = get_val(d, "Entry", default=0)
                    if entry == 0: position_deals[pid]["in"] = d
                    elif entry == 1: position_deals[pid]["out"] = d
                except: pass

            for pid, pair in position_deals.items():
                if not pair["out"]: continue
                out_d = pair["out"]
                in_d = pair["in"]
                tick = get_val(out_d, "Deal", "Ticket", default=0)
                if tick == 0: continue
                
                ot = int(get_val(in_d, "Time", default=0)) if in_d else int(get_val(out_d, "Time", default=0))
                ct = int(get_val(out_d, "Time", default=ot))
                
                t = {
                    "login": login,
                    "ticket": tick,
                    "symbol": get_val(out_d, "Symbol", "symbol", default=""),
                    "type": int(get_val(out_d, "Action", "Type", "type", default=0)),
                    "lots": float(get_val(out_d, "Volume", "volume", default=0)) / 10000.0 if float(get_val(out_d, "Volume", "volume", default=0)) > 100 else float(get_val(out_d, "Volume", "volume", default=0)), 
                    "volume": float(get_val(out_d, "Volume", "volume", default=0)),
                    "price": float(get_val(in_d, "Price", "price", default=0.0)) if in_d else float(get_val(out_d, "Price", "price", default=0.0)),
                    "close_price": float(get_val(out_d, "Price", "price", default=0.0)),
                    "profit": float(get_val(out_d, "Profit", "profit", default=0.0)),
                    "commission": float(get_val(out_d, "Commission", "commission", default=0.0)),
                    "swap": float(get_val(out_d, "Storage", "Swap", "swap", default=0.0)),
                    "time": ot,
                    "close_time": ct,
                    "is_closed": True
                }
                results.append(t)
                current_tickets.add(tick)

            # --- PROCESS OPEN ---
            for d in open_pos:
                try:
                    tick = get_val(d, "Position", "Ticket", "Deal", default=0)
                    if tick == 0: continue
                    t = {
                        "login": login,
                        "ticket": tick,
                        "ticket": tick,
                        "symbol": get_val(d, "Symbol", "symbol", default=""),
                        "type": int(get_val(d, "Action", "Type", "Cmd", "type", default=0)),
                        "volume": float(get_val(d, "Volume", "volume", default=0)),
                        "price": float(get_val(d, "PriceOpen", "Price", "price_open", "price", default=0.0)),
                        "close_price": float(get_val(d, "PriceCurrent", "Price", "price_current", "price", default=0.0)),
                        "profit": float(get_val(d, "Profit", "profit", default=0.0)),
                        "commission": float(get_val(d, "Commission", "commission", default=0.0)),
                        "swap": float(get_val(d, "Storage", "Swap", "swap", default=0.0)),
                        "time": int(get_val(d, "TimeCreate", "Time", "time_setup", "time", default=0)),
                        "close_time": None,
                        "is_closed": False
                    }
                    results.append(t)
                    current_tickets.add(tick)
                except: pass

            # Optimization: Incremental Check
            if data.incremental and login in last_synced_tickets:
                prev = last_synced_tickets[login]
                new_t = current_tickets - prev
                # Filter results
                results = [r for r in results if r["ticket"] in new_t]
            
            # Update cache
            last_synced_tickets[login] = current_tickets
            
            all_results.extend(results)

        except Exception as e:
            print(f"⚠️ Error bulk syncing {login}: {e}")
            continue

    print(f"⚡ Bulk Sync Complete: Returned {len(all_results)} trades total.")
    return {"trades": all_results}

# --- RISK MONITOR: STOP OUT LOGIC ---

failed_accounts = set()

def is_failed(login):
    return login in failed_accounts

def mark_failed(login):
    failed_accounts.add(login)

class StopOutRequest(BaseModel):
    login: int
    min_equity_limit: float
    disable_account: bool = True
    close_positions: bool = True

# ---------------- CORE STOP-OUT ACTIONS ----------------
def disable_account(user):
    print(f"ACTION: Disabling user {user.Login}...")
    
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
             
             # VERIFICATION: Re-fetch user to see if it stuck
             updated_user = worker.manager.UserRequest(user.Login)
             if updated_user:
                 print(f"VERIFY: Post-Update Enable: {getattr(updated_user, 'Enable', 'N/A')}")
                 print(f"VERIFY: Post-Update Rights: {getattr(updated_user, 'Rights', 'N/A')}")
                 print(f"VERIFY: Post-Update Comment: {getattr(updated_user, 'Comment', 'N/A')}")
                 
             return True
        
        print(f"ERROR: UserUpdate failed for {user.Login}. Check Manager Permissions.")
        
        if hasattr(worker.manager, "GetLastError"):
             print(f"MT5 Error Code: {worker.manager.GetLastError()}")
             
        return False

    except Exception as e:
        print(f"EXCEPTION: UserUpdate failed: {e}")
        return False

def force_close_positions(login: int):
    closed = 0
    try:
        positions = worker.manager.PositionRequest(login) or []
        for pos in positions:
            try:
                # Use Position attributes for ticket and volume
                ticket = get_val(pos, "Position", "Ticket", "Deal", default=0)
                volume = int(get_val(pos, "Volume", default=0))
                
                # PnL Calculation for Synthetic Close
                profit = float(get_val(pos, "Profit", default=0.0))
                storage = float(get_val(pos, "Storage", default=0.0))
                commission = float(get_val(pos, "Commission", default=0.0))
                total_pnl = profit + storage + commission
                
                if ticket > 0:
                    closed_successfully = False
                    
                    # ---------------------------------------------------------
                    # STRATEGY 0: EXTERNAL C++ TOOL (MT5StopOutEngine.exe)
                    # ---------------------------------------------------------
                    # If the user has compiled the C++ tool, use it for "Perfect Close"
                    if not closed_successfully and os.path.exists("MT5StopOutEngine.exe"):
                         try:
                             # print(f"DEBUG: Running MT5StopOutEngine.exe for {login}")
                             result = subprocess.run(["MT5StopOutEngine.exe", str(login)], capture_output=True, text=True)
                             if result.returncode == 0:
                                  print(f"   ✅ External StopOut Success: {ticket}")
                                  closed_successfully = True
                             else:
                                  print(f"   ⚠️ External StopOut Failed: {result.stderr}")
                         except Exception as e:
                             print(f"   ⚠️ External Tool Error: {e}")

                    # ---------------------------------------------------------
                    # STRATEGY 1: NATIVE STOP OUT (The "Golden Rule")
                    # ---------------------------------------------------------
                    if not closed_successfully and hasattr(MT5Manager, "MTRequest"):
                        try:
                            # Attempt to create the formal request
                            if hasattr(worker.manager, "PositionClose"):
                                print("   ℹ️ Found PositionClose! This might be the method.")
                            
                            if hasattr(worker.manager, "OrderSend"):
                                print("   ℹ️ Found OrderSend! This might be the Client API method.")
                            
                            req = MT5Manager.MTRequest()
                            
                            if req is None:
                                # This is the known library bug, but we check anyway per instruction
                                print("   ℹ️ Native StopOut Skipped: Library returned None for MTRequest()")
                            else:
                                # Fetch Symbol Info for Price
                                price = 0.0
                                try:
                                    # Try to get current price (Bid for Buy pos, Ask for Sell pos)
                                    # Note: We don't know exact method for SymbolInfo, trying SymbolInfoGet
                                    if hasattr(worker.manager, "SymbolInfoGet"):
                                        sym_info = worker.manager.SymbolInfoGet(pos.Symbol)
                                        if sym_info:
                                            # Assuming Type 0 = Buy (Close at Bid), Type 1 = Sell (Close at Ask)
                                            price = sym_info.Bid if pos.Type == 0 else sym_info.Ask
                                except:
                                    pass

                                res = MT5Manager.MTConfirm()
                                req.Action = MT5Manager.MTRequest.EnTradeActions.TA_STOPOUT_POSITION
                                req.Login = login
                                req.Position = ticket
                                req.Symbol = pos.Symbol # User says this is mandatory
                                req.Volume = int(volume) # User says use INT
                                req.Price = price # User says use Price, not PriceOrder
                                req.Comment = "STOP OUT"
                                
                                # Add Type and Filling (Standard Requirements)
                                # Type 0 = Buy, Type 1 = Sell. We need opposite.
                                try:
                                    req.Type = MT5Manager.MTRequest.EnOrderType.OP_SELL if pos.Type == 0 else MT5Manager.MTRequest.EnOrderType.OP_BUY
                                    req.TypeFilling = MT5Manager.MTRequest.EnOrderFilling.ORDER_FILLING_FOK
                                except:
                                    pass
                                
                                if worker.manager.DealerSend(req, res):
                                    if res.ResultRetcode in [MT5Manager.EnMTAPIRetcode.MT_RET_OK, MT5Manager.EnMTAPIRetcode.MT_RET_REQUEST_DONE]:
                                         print(f"   ✅ Native StopOut Success: {ticket}")
                                         closed_successfully = True
                                    else:
                                         print(f"   ⚠️ DealerSend Rejected: {res.ResultRetcode}")
                                else:
                                     print(f"   ⚠️ DealerSend Failed to Send")
                        except Exception as e:
                            print(f"   ℹ️ Native Attempt Error: {e}")
                            pass

                    # ---------------------------------------------------------
                    # FALLBACK: SYNTHETIC CLOSE (Delete + Balance Correct)
                    # ---------------------------------------------------------
                    if not closed_successfully:
                         # A) Delete the Position (Vanish)
                         if hasattr(worker.manager, "PositionDeleteByTicket"):
                             worker.manager.PositionDeleteByTicket(ticket)
                             closed_successfully = True
                         elif hasattr(worker.manager, "PositionDelete"):
                              worker.manager.PositionDelete(pos)
                              closed_successfully = True
                         else:
                             print("❌ CRITICAL: No Delete Method Found!")
                             continue
                        
                         # B) Apply PnL (If Delete succeeded)
                         # if closed_successfully and abs(total_pnl) > 0.01:
                         #     print(f"   💸 Applying Synthetic PnL: {total_pnl:.2f}")
                         #     try:
                         #          comment = f"StopOut #{ticket}"
                         #          if hasattr(worker.manager, "DealerBalance"):
                         #               try:
                         #                   worker.manager.DealerBalance(login, total_pnl, 1, comment)
                         #               except TypeError:
                         #                   worker.manager.DealerBalance(login, total_pnl, comment)
                         #     except Exception as e:
                         #          print(f"   ❌ Failed to apply PnL: {e}")
            except Exception as e:
                print(f"❌ Close failed {pos}: {e}")
    except Exception as e:
        print(f"❌ PositionRequest failed: {e}")
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

class SingleAccountRequest(BaseModel):
    login: int

# ---------------- SINGLE ACCOUNT ACTIONS (ADMIN) ----------------
@app.post("/disable-account")
def disable_account_endpoint(req: SingleAccountRequest):
    if not worker.connected:
        worker.connect()
    
    try:
        user = worker.manager.UserRequest(req.login)
        if not user:
             raise HTTPException(status_code=404, detail="Account not found")
        
        if disable_account(user):
            return {"status": "success", "message": f"Account {req.login} disabled"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update user rights")
            
    except Exception as e:
        print(f"❌ Disable failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/stop-out-account")
def stop_out_account_endpoint(req: SingleAccountRequest):
    if not worker.connected:
        worker.connect()
    
    # 1. Close Positions (Market)
    closed_pos = force_close_positions(req.login)
    
    # 2. Close Orders (Pending)
    closed_orders = force_close_orders(req.login)
    
    # 3. Disable User
    user = worker.manager.UserRequest(req.login)
    disabled = False
    if user:
         disabled = disable_account(user)
    
    return {
        "status":"success", 
        "positions_closed": closed_pos,
        "orders_closed": closed_orders, 
        "account_disabled": disabled
    }


# ---------------- BULK STOP OUT ----------------
@app.post("/check-bulk")
def check_bulk(requests: List[StopOutRequest]):
    if not worker.connected:
        worker.connect()

    results = []
    print(f"🔄 Batch Processing {len(requests)} accounts...")

    for req in requests:
        if is_failed(req.login):
            continue

        try:
            equity = 0.0
            balance = 0.0
            
            # 1. CACHE FAST PATH: Use UserAccountGet (No Server Hit typically)
            account_data_found = False
            if hasattr(worker.manager, "UserAccountGet"):
                 account = worker.manager.UserAccountGet(req.login)
                 if account:
                     equity = getattr(account, "Equity", 0.0)
                     balance = getattr(account, "Balance", 0.0)
                     account_data_found = True
            
            # 2. SLOW PATH: UserRequest (Server Hit) - Only if cache failed
            user = None
            if not account_data_found:
                 # print(f"⚠️ Cache miss for {req.login}, fetching from Server...")
                 user = worker.manager.UserRequest(req.login)
                 if user:
                     equity = getattr(user, "Equity", 0.0)
                     balance = getattr(user, "Balance", 0.0)
                     # print(f"DEBUG: UserRequest({req.login}) Eq: {equity}") 
                 else:
                     continue # Account invalid or disconnected

            # CRITICAL SAFETY: If account is 0/0 (Race condition or empty), SKIP IT.
            if equity <= 0.001 and balance <= 0.001:
                 continue

            if equity == 0.0 and balance > 0.0:
                 # print(f"⚠️ {req.login}: Eq 0.0 with Bal {balance}. Using Balance.")
                 equity = balance

            if equity <= req.min_equity_limit:
                print(f"⚠️ STOP OUT: {req.login} Eq:{equity} <= {req.min_equity_limit}")

                actions = []

                if req.close_positions:
                    closed = force_close_positions(req.login)
                    closed_orders = force_close_orders(req.login)
                    actions.append(f"closed_{closed}_positions")

                if req.disable_account:
                    if not user:
                        user = worker.manager.UserRequest(req.login)
                    
                    if user:
                         if disable_account(user):
                             actions.append("account_disabled")
                    else:
                         print(f"❌ Could not fetch user {req.login} for disabling")

                mark_failed(req.login)

                results.append({
                    "login": req.login,
                    "status": "FAILED",
                    "equity": equity,
                    "balance": balance,
                    "actions": actions
                })

                # 3. Webhook to CRM (Notify Breach)
                try:
                    webhook_payload = {
                        "event": "account_breached",
                        "login": req.login,
                        "reason": f"System Enforcement Breach: Eq {equity} <= Limit {req.min_equity_limit}",
                        "equity": equity,
                        "balance": balance,
                        "timestamp": datetime.now().isoformat()
                    }
                    headers = {}
                    if MT5_WEBHOOK_SECRET:
                        headers['x-mt5-secret'] = MT5_WEBHOOK_SECRET
                        
                    requests.post(CRM_WEBHOOK_URL, json=webhook_payload, headers=headers, timeout=5)
                    print(f"📧 Webhook sent for {req.login}")
                except Exception as we:
                    print(f"❌ Webhook Failed for {req.login}: {we}")
            else:
                results.append({
                    "login": req.login,
                    "status": "SAFE",
                    "equity": equity,
                    "balance": balance
                })

        except Exception as e:
            print(f"❌ Error for {req.login}: {e}")
            traceback.print_exc()

    return results
