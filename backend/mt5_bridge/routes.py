from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import traceback
import random
import string
from datetime import datetime, timedelta
from mt5_service import worker, force_close_positions, force_close_orders, disable_account, is_failed, mark_failed, last_synced_tickets

router = APIRouter()

# --- HELPER: Safely get value ---
def get_val(obj, *names, default=None):
    for name in names:
        if hasattr(obj, name): return getattr(obj, name)
    return default

# --- MODELS ---
class AccountRequest(BaseModel):
    name: str
    email: str
    group: str
    leverage: int = 100
    balance: float = 10000

class DepositRequest(BaseModel):
    login: int
    amount: float
    comment: str = "Manual Deposit"

class FetchRequest(BaseModel):
    login: int
    incremental: bool = False

class SingleAccountRequest(BaseModel):
    login: int

class StopOutRequest(BaseModel):
    login: int
    min_equity_limit: float
    disable_account: bool = True
    close_positions: bool = True

# --- API ENDPOINTS ---

@router.post("/create-account")
def create_account(data: AccountRequest):
    if not worker.connected: 
        worker.connect()
    
    # Split name
    name_parts = data.name.strip().split(' ', 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else "Trader"
    
    try:
        result = worker.create_account(
            first=first_name,
            last=last_name,
            group=data.group,
            leverage=data.leverage,
            balance=data.balance,
            callback_url="" 
        )
        
        print(f"✅ Created Account: {result['login']}")
        
        # EXPLICIT DEPOSIT
        if data.balance > 0:
            print(f"💰 Attempting to deposit {data.balance}...")
            try:
                if hasattr(worker.manager, "DealerBalance"):
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

@router.post("/deposit")
def deposit_funds(data: DepositRequest):
    if not worker.connected:
        worker.connect()
        
    print(f"💰 Manual Deposit Request: {data.amount} for {data.login}")
    
    try:
        if hasattr(worker.manager, "DealerBalance"):
            worker.manager.DealerBalance(data.login, data.amount, data.comment)
            return {"status": "success", "message": f"Deposited {data.amount}"}
        else:
            print("❌ DealerBalance method missing!")
            raise HTTPException(status_code=500, detail="DealerBalance method missing")
            
    except Exception as e:
        print(f"❌ Deposit Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/fetch-trades")
def fetch_trades(data: FetchRequest):
    if not worker.connected:
        worker.connect()

    try:
        login = data.login
        results = []
        current_tickets = set()
        
        # 1. Fetch Deals (History)
        from_time = int((datetime.now() - timedelta(days=30)).timestamp()) # Custom fetch range
        to_time = int(datetime.now().timestamp())
        deals = worker.get_deals(login, from_time, to_time) if hasattr(worker, 'get_deals') else []
        
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
                # print(f"⚠️ Error grouping deal: {e}")
                pass
        
        # Now process matched closed positions
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
                    "login": login,
                    "ticket": position_id, # Use PositionID as ticket to match Open Position (upsert logic)
                    "symbol": get_val(out_deal, "Symbol", default=""),
                    "type": int(get_val(out_deal, "Action", "Type", default=0)),
                    "entry": int(get_val(out_deal, "Entry", default=1)),
                    "volume": float(get_val(out_deal, "Volume", default=0)),
                    "price": float(get_val(in_deal, "Price", default=0.0)) if in_deal else float(get_val(out_deal, "Price", default=0.0)),
                    "close_price": float(get_val(out_deal, "Price", default=0.0)),
                    "profit": float(get_val(out_deal, "Profit", default=0.0)),
                    "commission": float(get_val(out_deal, "Commission", default=0.0)),
                    "swap": float(get_val(out_deal, "Storage", default=0.0)),
                    "time": open_time,
                    "close_time": close_time,
                    "duration": duration,
                    "is_closed": True
                }
                results.append(t)
                current_tickets.add(position_id)
            except Exception as e:
                print(f"⚠️ Error processing matched position {position_id}: {e}")
                pass
        
        # 2. Fetch Open Positions
        positions = worker.get_positions(login) if hasattr(worker, 'get_positions') else []
        for d in positions:
            try:
                ticket = get_val(d, "Position", "Ticket", "Deal", default=0)
                
                if ticket == 0:
                    continue
                    
                open_time = int(get_val(d, "TimeCreate", "Time", default=0))
                
                t = {
                    "login": login,
                    "ticket": ticket,
                    "symbol": get_val(d, "Symbol", default=""),
                    "type": int(get_val(d, "Action", "Type", "Cmd", default=0)), 
                    "entry": int(get_val(d, "Entry", default=0)),
                    "volume": float(get_val(d, "Volume", default=0)),
                    "price": float(get_val(d, "PriceOpen", "Price", default=0.0)),
                    "close_price": float(get_val(d, "PriceCurrent", "Price", default=0.0)), 
                    "profit": float(get_val(d, "Profit", default=0.0)),
                    "commission": float(get_val(d, "Commission", default=0.0)),
                    "swap": float(get_val(d, "Storage", "Swap", default=0.0)),
                    "time": open_time,
                    "close_time": None,
                    "duration": None,
                    "is_closed": False
                }
                results.append(t)
                current_tickets.add(ticket)
            except Exception as e:
                print(f"⚠️ Error processing open position: {e}")
                pass
        
        # Polling optimization: only return NEW trades if incremental mode
        if data.incremental and login in last_synced_tickets:
            previous_tickets = last_synced_tickets[login]
            new_tickets = current_tickets - previous_tickets
            # Filter results to only valid unique tickets
            results = [t for t in results if t["ticket"] in new_tickets]
            print(f"⚡ Incremental sync: {len(results)} new trades for {login}")
        else:
            print(f"⚡ Full sync: sending {len(results)} trades for {login}")

        # Update cache
        last_synced_tickets[login] = current_tickets
        
        return {"trades": results}

    except Exception as e:
        print(f"❌ Fetch Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/fetch-trades-full")
def fetch_trades_full(data: FetchRequest):
    # Place holder for the full logic if needed.
    # OR I should have moved it to service. 
    # Actually, logic belongs in Service.
    return {"trades": []}

@router.post("/disable-account")
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

@router.post("/stop-out-account")
def stop_out_account_endpoint(req: SingleAccountRequest):
    if not worker.connected:
        worker.connect()
    
    # 1. Close Positions (Market) - DISABLED PER USER REQUEST
    # closed_pos = force_close_positions(req.login)
    closed_pos = 0
    
    # 2. Close Orders (Pending) - DISABLED PER USER REQUEST
    # closed_orders = force_close_orders(req.login)
    closed_orders = 0
    
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

@router.post("/check-bulk")
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
            
            # 1. CACHE FAST PATH
            account_data_found = False
            if hasattr(worker.manager, "UserAccountGet"):
                 account = worker.manager.UserAccountGet(req.login)
                 if account:
                     equity = getattr(account, "Equity", 0.0)
                     balance = getattr(account, "Balance", 0.0)
                     account_data_found = True
            
            # 2. SLOW PATH
            user = None
            if not account_data_found:
                 user = worker.manager.UserRequest(req.login)
                 if user:
                     equity = getattr(user, "Equity", 0.0)
                     balance = getattr(user, "Balance", 0.0)
                 else:
                     continue 

            if equity <= 0.001 and balance <= 0.001:
                 continue

            if equity == 0.0 and balance > 0.0:
                 print(f"⚠️ {req.login}: Equity 0.0 detected with Balance {balance}. Using Balance as Equity.")
                 equity = balance

            if equity <= req.min_equity_limit:
                print(f"⚠️ STOP OUT: {req.login} Eq:{equity} <= {req.min_equity_limit}")

                actions = []

                if req.close_positions:
                    # closed = force_close_positions(req.login)
                    # closed_orders = force_close_orders(req.login)
                    # actions.append(f"closed_{closed}_positions")
                    pass # DISABLED PER USER REQUEST

                if req.disable_account:
                    if not user:
                        user = worker.manager.UserRequest(req.login)
                    
                    if user:
                         if disable_account(user):
                             actions.append("account_disabled")
                         # actions.append("account_disabled_SKIPPED")
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
