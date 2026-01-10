import time
import requests
from datetime import datetime, timedelta

def start_polling(worker, groups_map, interval=10):
    """
    Polls MT5 groups for trades and sends them to webhook endpoints.
    
    Args:
        worker: MT5Worker instance with .manager attribute
        groups_map: Dict mapping group names to callback URLs
        interval: Polling interval in seconds (default 10)
    """
    print(f"🔄 Trade Poller Started. Interval: {interval}s")
    print(f"📊 Monitoring Groups: {list(groups_map.keys())}")
    
    last_poll_times = {}
    
    while True:
        try:
            for group_name, callback_url in groups_map.items():
                try:
                    # Get all users in this group
                    users = get_users_in_group(worker, group_name)
                    
                    if not users:
                        continue
                    
                    # Get last poll time for this group (default to 5 min ago)
                    last_poll = last_poll_times.get(group_name, 
                                                    datetime.now() - timedelta(minutes=5))
                    
                    # Collect all trades from all users
                    all_trades = []
                    
                    for user_login in users:
                        try:
                            # Get positions (open trades)
                            positions = worker.get_positions(user_login) if hasattr(worker, 'get_positions') else []
                            
                            # Get deals (closed trades since last poll)
                            from_time = int(last_poll.timestamp())
                            to_time = int(datetime.now().timestamp())
                            deals = worker.get_deals(user_login, from_time, to_time) if hasattr(worker, 'get_deals') else []
                            
                            # Combine and format
                            for pos in positions:
                                all_trades.append(format_trade(pos, user_login, is_open=True))
                            
                            for deal in deals:
                                all_trades.append(format_trade(deal, user_login, is_open=False))
                                
                        except Exception as e:
                            print(f"⚠️ Error fetching trades for {user_login}: {e}")
                            continue
                    
                    # Send to webhook if we have trades
                    if all_trades and callback_url:
                        send_to_webhook(callback_url, all_trades)
                    
                    # Update last poll time
                    last_poll_times[group_name] = datetime.now()
                    
                except Exception as e:
                    print(f"⚠️ Error polling group {group_name}: {e}")
                    continue
            
            # Sleep before next cycle
            time.sleep(interval)
            
        except KeyboardInterrupt:
            print("🛑 Trade Poller Stopped")
            break
        except Exception as e:
            print(f"❌ Poller Error: {e}")
            time.sleep(interval)


def get_users_in_group(worker, group_name):
    """Get all user logins in a specific MT5 group"""
    try:
        if not hasattr(worker, 'manager') or worker.manager is None:
            print("⚠️ Worker has no manager instance.")
            return []
        
        # Method 1: pymt5adapter UserLogins (Optimal)
        if hasattr(worker.manager, 'UserLogins'):
            logins = worker.manager.UserLogins(group_name)
            if logins:
                return logins
            # If returns None or empty, might be no users or error
            
        # Method 2: UserRequest with wildcard (Fallback)
        # Note: This scans ALL users, so it's heavier. Use only if Method 1 fails.
        if hasattr(worker.manager, 'UserRequest'):
            # Some bindings accept a group mask in UserRequest or separate method
            pass

        print(f"⚠️ Warning: Could not fetch users for group '{group_name}'. Check Manager API permissions.")
        return []
        
    except Exception as e:
        print(f"⚠️ Error fetching users for group {group_name}: {e}")
        return []



def format_trade(trade_obj, login, is_open=True):
    """Format trade object for webhook"""
    try:

        # Determine Ticket ID (CRITICAL: Must match Open Position ID)
        if not is_open:
            # For DEALS (Closed), the 'Ticket' is the Deal Ticket.
            # We want 'PositionID' to match the original Open Position.
            chk_pos_id = getattr(trade_obj, 'PositionID', 0)
            if chk_pos_id == 0:
                # Fallback attempts if attribute names differ in bindings
                chk_pos_id = getattr(trade_obj, 'Position', 0)
            
            # If we found a valid PositionID, use it. Otherwise fallback to Ticket (though risky).
            ticket_id = chk_pos_id if chk_pos_id > 0 else getattr(trade_obj, 'Deal', getattr(trade_obj, 'Ticket', 0))
        else:
            # For POSITIONS (Open), the 'Ticket' IS the Position ID.
            ticket_id = getattr(trade_obj, 'Position', getattr(trade_obj, 'Ticket', 0))

        return {
            "login": login,
            "ticket": ticket_id,
            "symbol": getattr(trade_obj, 'Symbol', ''),
            "type": getattr(trade_obj, 'Action', getattr(trade_obj, 'Type', 0)),
            "volume": getattr(trade_obj, 'Volume', getattr(trade_obj, 'VolumeExt', 0)),
            "price": getattr(trade_obj, 'PriceOpen', getattr(trade_obj, 'Price', 0.0)),
            "close_price": getattr(trade_obj, 'PriceClose', None) if not is_open else None,
            "profit": getattr(trade_obj, 'Profit', 0.0),
            "commission": getattr(trade_obj, 'Commission', 0.0),
            "swap": getattr(trade_obj, 'Storage', getattr(trade_obj, 'Swap', 0.0)),
            "time": getattr(trade_obj, 'TimeCreate', getattr(trade_obj, 'Time', int(datetime.now().timestamp()))),
            "close_time": getattr(trade_obj, 'Time', None) if not is_open else None, # For Deals, 'Time' is close time.
            "is_closed": not is_open
        }
    except Exception as e:
        print(f"⚠️ Error formatting trade: {e}")
        return None


def send_to_webhook(url, trades):
    """Send trades to webhook endpoint"""
    try:
        # Group trades by login for batch processing
        trades_by_login = {}
        for trade in trades:
            if trade:
                login = trade.get('login')
                if login not in trades_by_login:
                    trades_by_login[login] = []
                trades_by_login[login].append(trade)
        
        # Send each user's trades
        for login, user_trades in trades_by_login.items():
            payload = {
                "login": login,
                "trades": user_trades
            }
            
            response = requests.post(url, json=payload, timeout=10)
            
            if response.status_code == 200:
                print(f"✅ Sent {len(user_trades)} trades for login {login}")
            else:
                print(f"⚠️ Webhook failed ({response.status_code}) for login {login}")
                
    except requests.exceptions.RequestException as e:
        print(f"❌ Webhook request failed: {e}")
    except Exception as e:
        print(f"❌ Error sending to webhook: {e}")
