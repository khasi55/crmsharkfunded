from typing import List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
try:
    from mt5_worker import MT5Worker
except ImportError:
    print("Warning: mt5_worker module not found. Risk Monitor will fail to connect.")
    # Mock for validation if needed
    class MT5Worker:
        def __init__(self): self.connected = False
        def connect(self): pass
        manager = None

# logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("RiskMonitor")

app = FastAPI()

# Initialize Worker
worker = MT5Worker()
if not worker.connected:
    try:
        worker.connect()
    except Exception as e:
        logger.error(f"Failed to connect MT5 Worker: {e}")

class StopOutRequest(BaseModel):
    login: int
    min_equity_limit: float # Absolute value. E.g. 92000 for 8% DD on 100k
    disable_account: bool = True
    close_positions: bool = True

@app.post("/check-bulk")
def check_bulk(requests: List[StopOutRequest]):
    """
    Batch processes multiple accounts for stop-out checks.
    Returns a list of results for ONLY the accounts that were breached or had errors.
    Safe accounts are omitted to reduce response size.
    """
    if not worker.connected:
        try:
             worker.connect()
        except:
             raise HTTPException(status_code=503, detail="MT5 Bridge not connected")

    if not hasattr(worker, 'manager') or worker.manager is None:
         raise HTTPException(status_code=500, detail="MT5 Manager not initialized")

    results = []
    
    logger.info(f"🔄 Batch Processing {len(requests)} accounts...")

    for req in requests:
        try:
            user = worker.manager.UserRequest(req.login)
            if user is None:
                continue # Skip invalid users silently

            current_equity = user.Equity
            
            # Check Breach
            if current_equity <= req.min_equity_limit:
                logger.warning(f"⚠️ BATCH STOP OUT: Account {req.login} Equity {current_equity} <= {req.min_equity_limit}")
                
                actions = []
                
                # 1. Disable
                if req.disable_account:
                    if user.Enable != 0:
                        user.Enable = 0
                        if worker.manager.UserUpdate(user):
                            actions.append("account_disabled")
                        else:
                            actions.append("disable_failed")
                    else:
                        actions.append("already_disabled")

                # 2. Stop Out (Execute Close)
                if req.close_positions:
                    try:
                        positions = worker.manager.PositionRequest(req.login)
                        if positions:
                            for pos in positions:
                                try:
                                    if hasattr(worker, 'close_position'):
                                        worker.close_position(pos.Ticket)
                                except: pass
                            actions.append("positions_closed_attempted")
                    except: pass

                results.append({
                    "login": req.login,
                    "status": "breached",
                    "equity": current_equity,
                    "actions": actions
                })
        
        except Exception as e:
            logger.error(f"Error in batch for {req.login}: {e}")
            results.append({"login": req.login, "status": "error", "message": str(e)})

    return results

@app.post("/check-stop-out")
def check_stop_out(data: StopOutRequest):
    """
    Checks if an account has breached the equity limit. 
    If yes, disables the account and optionally closes open positions.
    """
    if not worker.connected:
        try:
            worker.connect()
        except:
            raise HTTPException(status_code=503, detail="MT5 Bridge not connected")

    try:
        # 1. Fetch User Info
        if not hasattr(worker, 'manager') or worker.manager is None:
             raise HTTPException(status_code=500, detail="MT5 Manager not initialized")

        user = worker.manager.UserRequest(data.login)
        if user is None:
            raise HTTPException(status_code=404, detail="Account not found")

        current_equity = user.Equity
        current_balance = user.Balance
        
        logger.info(f"Checking Account {data.login}: Eq=${current_equity}, Limit=${data.min_equity_limit}")

        if current_equity <= data.min_equity_limit:
            logger.warning(f"⚠️ STOP OUT TRIGGERED: Account {data.login} Equity ({current_equity}) <= Limit ({data.min_equity_limit})")
            
            actions_taken = []

            # 1. IMMEDIATE DISABLE (First Priority)
            if data.disable_account:
                try:
                    # 0 = Disabled, 1 = Enabled
                    if user.Enable != 0:
                        user.Enable = 0 
                        # Change group to 'disabled' to ensure they can't reconnect/trade even if enable flag glitches
                        # user.Group = "demo\\disabled" 
                        
                        update_res = worker.manager.UserUpdate(user)
                        if update_res:
                            actions_taken.append("account_disabled")
                            logger.info(f"✅ Priority Action: Account {data.login} DISABLED.")
                        else:
                            logger.error(f"❌ Priority Action Failed: Could not disable account {data.login}")
                            actions_taken.append("disable_failed")
                    else:
                        actions_taken.append("already_disabled")
                        logger.info(f"ℹ️ Account {data.login} was already disabled.")
                except Exception as e:
                    logger.error(f"❌ Error during account disable: {e}")
                    actions_taken.append("disable_error")

            # 2. EXECUTE STOP OUT (Close All Positions)
            if data.close_positions:
                try:
                    positions = worker.manager.PositionRequest(data.login)
                    if positions:
                        logger.info(f"📉 Executing Stop Out: Closing {len(positions)} positions for {data.login}...")
                        count_closed = 0
                        for pos in positions:
                            try:
                                # Attempt to close position using DealerSend (Standard Manager API)
                                # Note: This usually requires constructing a request. 
                                # We assume worker has a helper or we use generic structure.
                                # Example: requests a Market Close (Type 200/Deal) for the volume.
                                
                                # Mocking the close call since we don't have the explicit 'mt5_worker' implementation
                                # If 'worker' has a 'close_position' method:
                                if hasattr(worker, 'close_position'):
                                    worker.close_position(pos.Ticket)
                                    count_closed += 1
                                else:
                                    logger.warning(f"⚠️ 'close_position' method missing on worker. Cannot close Ticket {pos.Ticket}.")
                            except Exception as pe:
                                logger.error(f"Failed to close position {pos.Ticket}: {pe}")
                        
                        actions_taken.append(f"closed_{count_closed}_positions")
                    else:
                        actions_taken.append("no_open_positions")
                        logger.info(f"ℹ️ No open positions to close for {data.login}.")
                except Exception as e:
                    logger.error(f"❌ Error during Stop Out execution: {e}")
                    actions_taken.append("stop_out_error")

            return {
                "status": "breached",
                "equity": current_equity,
                "limit": data.min_equity_limit,
                "actions": actions_taken
            }

        return {
            "status": "safe",
            "equity": current_equity,
            "margin_level": user.MarginLevel,
            "gap": current_equity - data.min_equity_limit
        }

    except Exception as e:
        logger.error(f"Error checking stop out: {e}")
        raise HTTPException(status_code=500, detail=str(e))
