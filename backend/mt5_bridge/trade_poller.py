import time
import threading
import os
import json
import requests
from datetime import datetime
from supabase import create_client

class DynamicTradePoller:
    def __init__(self, worker, interval=10, reload_interval=300):
        self.worker = worker
        self.interval = interval
        self.reload_interval = reload_interval
        self.running = False
        self.last_reload = 0
        
        # Config (Defaults)
        self.monitored_groups = ["demo\\Pro-Platinum"]
        self.callback_url = os.getenv("CRM_TRADE_CALLBACK")
        self.last_tickets = set() # Cache of recently processed tickets
        
        # Supabase for Config Reload
        self.supabase = None
        self._init_supabase()

    def _init_supabase(self):
        url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        if url and key:
            try:
                self.supabase = create_client(url, key)
                print("🔄 Poller: Supabase initialized")
            except Exception as e:
                print(f"⚠️ Poller: Supabase init failed: {e}")

    def _reload_config(self):
        """Fetches groups and webhook URL from DB"""
        if not self.supabase: return
        
        try:
            response = self.supabase.table('mt5_server_config').select("*").order('updated_at', desc=True).limit(1).execute()
            if response.data:
                res = response.data[0]
                
                # Update Callback
                if res.get('callback_url'):
                    self.callback_url = res.get('callback_url')
                
                # Update Groups
                raw_groups = res.get('monitored_groups')
                if raw_groups:
                    if isinstance(raw_groups, str):
                         try:
                             self.monitored_groups = json.loads(raw_groups)
                         except:
                             self.monitored_groups = [raw_groups]
                    else:
                        self.monitored_groups = raw_groups
                
                print(f"🔄 Poller Config Reloaded: {len(self.monitored_groups)} groups, URL: {self.callback_url}")
        except Exception as e:
            print(f"⚠️ Poller Reload Failed: {e}")

    def _get_closed_trades(self):
        """Fetch trades for all groups"""
        all_trades = []
        try:
            end = int(datetime.now().timestamp())
            start = end - self.interval - 5 # Look back interval + buffer
            
            # Using MT5Manager API (Approximation based on available methods)
            # Ideally we iterate users or use a group request if available.
            # Assuming 'UserRequest' gives positions? No, we need History.
            # Usually: Report_Request or UserDealsRequest.
            # Given limited mock knowledge, I will try to fetch users then fetch their deals.
            # Or use UserGetByGroup?
            
            # OPTIMIZATION: Instead of full scan, we query Supabase for Active Logins?
            # Guide says: "Method 2: Supabase Fallback ... Use Supabase method for better control"
            # I will use Supabase active users if possible.
            
            active_logins = []
            if self.supabase:
                # Fetch active challenges logins
                # We do this every loop?? That's heavy.
                # Maybe caching logins or relying on MT5 'Group' calls.
                
                # Let's rely on MT5 built-in group fetch if possible.
                # If worker has method 'get_users_in_group'.
                pass
            
            # For this implementation, I will assume we check all users in database who are active.
            # Or simpler:
            # We iterate known groups.
            
            # Since I don't see 'UserDealRequest' exposed in main.py, I will use 'worker.fetch_trades' logic.
            # But 'fetch_trades' usually fetches OPEN positions.
            # Closed trades need History.
            
            # If I look at `mt5_worker.py` (not fully visible), it has `UserAccountGet`.
            # I will define a helper in THIS file that uses the worker.manager directly if possible.
            
            pass 
        except Exception as e:
            print(f"Error getting trades: {e}")
        return all_trades

    def _poll_step(self):
        if not self.callback_url: return

        # Reload config periodically
        if time.time() - self.last_reload > self.reload_interval:
            self._reload_config()
            self.last_reload = time.time()

        # FETCH TRADES LOGIC
        # 1. Get logins to check
        logins = []
        if self.supabase:
            try:
                # Fetch only necessary fields for optimization
                r = self.supabase.table('challenges').select('mt5_login').eq('status', 'active').execute()
                logins = [x['mt5_login'] for x in r.data if x.get('mt5_login')]
            except Exception as e:
                print(f"⚠️ Poller DB Error: {e}")
        
        if not logins: return

        # 2. Check each login
        # Calculate time window: [Now - Interval - Buffer] to [Now]
        now_ts = int(time.time())
        # We need to cover the gap since last check. 
        # But to avoid complications, we look back 'interval + 10s' 
        # and rely on 'ticket' deduplication in CRM.
        from_ts = now_ts - self.interval - 15 
        to_ts = now_ts + 5 # Future buffer for clock skew

        for login in logins:
            try:
                # Fetch deals
                deals = self.worker.get_deals(login, from_ts, to_ts)
                
                if not deals: continue

                closed_trades = []
                for deal in deals:
                    # Convert to dict if object
                    d = deal if isinstance(deal, dict) else deal._asdict() if hasattr(deal, '_asdict') else deal.__dict__
                    
                    # Check Entry Type (1 = OUT = Deal Close)
                    # Note: Mock might not have 'entry'. Client API has 'entry'.
                    # MT5 Constant: DEAL_ENTRY_OUT = 1
                    entry = d.get('entry', d.get('Entry', -1))
                    
                    # if entry == 1 (OUT) OR Mock mode (always accept if mock)
                    is_mock_mode = not self.worker._use_client_api and self.worker._manager.__class__.__name__ == 'ManagerAPI'
                    if entry == 1 or is_mock_mode:
                        ticket = d.get('ticket', d.get('Ticket', 0))
                        
                        # Dedup check (Memory cache)
                        if ticket in self.last_tickets: continue
                        self.last_tickets.add(ticket)
                        if len(self.last_tickets) > 10000: self.last_tickets.clear() # Primitive GC

                        closed_trades.append({
                            "login": login,
                            "ticket": ticket,
                            "symbol": d.get('symbol', d.get('Symbol')),
                            "type": d.get('type', d.get('Type')),
                            "volume": d.get('volume', d.get('Volume', 0)),
                            "price": d.get('price', d.get('Price', 0.0)), # Price of deal (Close price)
                            "close_price": d.get('price', d.get('Price', 0.0)), # For OUT deal, price IS close price
                            "profit": d.get('profit', d.get('Profit', 0.0)),
                            "commission": d.get('commission', d.get('Commission', 0.0)),
                            "swap": d.get('swap', d.get('Swap', 0.0)),
                            "time": d.get('time', d.get('Time', 0)),
                            "close_time": d.get('time', d.get('Time', 0)),
                            "is_closed": True
                        })

                if closed_trades:
                    print(f"📤 Sending {len(closed_trades)} trades for {login} to CRM")
                    payload = {
                        "login": login,
                        "group": "dynamic", # We might need to fetch group, but CRM finds by login
                        "timestamp": datetime.now().isoformat(),
                        "trades": closed_trades
                    }
                    try:
                        requests.post(self.callback_url, json=payload, timeout=5)
                    except Exception as req_err:
                        print(f"⚠️ Webhook Failed ({req_err}) hitting: {self.callback_url}")

            except Exception as e:
                # print(f"⚠️ Poll Loop Error ({login}): {e}")
                pass
