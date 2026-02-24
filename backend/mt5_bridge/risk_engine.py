
import time
import json
import threading
import requests
import os
from datetime import datetime, timezone

# Load Rules
RULES_FILE = os.path.join(os.path.dirname(__file__), "risk_rules.json")
rules_cache = {}

def load_rules():
    global rules_cache
    try:
        with open(RULES_FILE, 'r') as f:
            rules_cache = json.load(f)
        print(f"✅ [RiskEngine] Loaded rules for {len(rules_cache)} groups.")
    except Exception as e:
        print(f"❌ [RiskEngine] Failed to load rules: {e}")

# Webhook Config
CRM_WEBHOOK_URL = os.environ.get("CRM_WEBHOOK_URL", "https://api.sharkfunded.co/api/webhooks/mt5")
MT5_WEBHOOK_SECRET = os.environ.get("MT5_WEBHOOK_SECRET", "")

class RiskEngine:
    def __init__(self, mt5_worker, supabase_client=None, ws_manager=None):
        self.worker = mt5_worker
        self.supabase = supabase_client
        self.ws_manager = ws_manager
        self.running = False
        self.thread = None
        self.lock = threading.Lock()
        
        # In-Memory State for Daily Equity
        # Key: login (int), Value: { "date": "YYYY-MM-DD", "equity": float }
        self.daily_equity_map = {} 
        
        # Account Metadata Cache
        # Key: login (int), Value: { "initial_balance": float, "type": str, "status": str }
        self.account_metadata = {}
        self.last_cache_refresh = 0
        self.CACHE_REFRESH_INTERVAL = 60 # Refresh every 60 seconds

        load_rules()
        self.refresh_account_metadata()

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.thread.start()
        print("🚀 [RiskEngine] Started Autonomous Risk Monitor Thread")

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join()

    def _monitor_loop(self):
        while self.running:
            try:
                # Periodic Cache Refresh
                if time.time() - self.last_cache_refresh > self.CACHE_REFRESH_INTERVAL:
                    self.refresh_account_metadata()

                self.check_all_accounts()
            except Exception as e:
                print(f"⚠️ [RiskEngine] Error in loop: {e}")
            
            time.sleep(0.5) 

    def refresh_account_metadata(self):
        """Fetches active accounts and their rules from Supabase"""
        if not self.supabase: return
        
        try:
            response = self.supabase.table('challenges') \
                .select('login, initial_balance, challenge_type, status, start_of_day_equity, current_equity') \
                .eq('status', 'active') \
                .execute()
                
            if response.data:
                new_metadata = {}
                for row in response.data:
                    login = row.get('login')
                    if login:
                        new_metadata[int(login)] = {
                            "initial_balance": float(row.get('initial_balance', 0)),
                            "type": row.get('challenge_type', ''),
                            "status": row.get('status', 'active'),
                            "start_of_day_equity": row.get('start_of_day_equity'),
                            "current_equity": row.get('current_equity')
                        }
                self.account_metadata = new_metadata
                # print(f"✅ [RiskEngine] Refreshed Metadata: {len(self.account_metadata)} accounts")
            
            self.last_cache_refresh = time.time()
            
        except Exception as e:
            print(f"⚠️ [RiskEngine] Metadata refresh failed: {e}")

    def check_all_accounts(self):
        # We now primarily iterate the account_metadata we have from CRM
        # This ensures we only check accounts that exist in the CRM database
        for login, meta in self.account_metadata.items():
            # Get real-time data from MT5 Worker for this specific login
            # Optimization: Worker could batch this, but for now we follow the existing pattern
            user_info = self.worker.get_user_info(login)
            if user_info:
                self.check_user(user_info, meta)

    def check_user(self, user_info, meta):
        """
        user_info: Dict { login, group, equity, balance }
        meta: Dict { initial_balance, type, status }
        """
        login = user_info.get('login')
        group = user_info.get('group')
        equity = user_info.get('equity')
        balance = user_info.get('balance')
        initial_balance = meta.get('initial_balance', 0)
        
        if initial_balance <= 0: return # Skip if no initial balance data

        # 1. Get Rules for the group
        rule = rules_cache.get(group)
        if not rule:
            max_dd_percent = 10.0
            daily_dd_percent = 5.0
            profit_target_percent = 0.0
        else:
            # Rule Override for Funded Accounts
            if 'funded' in meta.get('type', '').lower():
                max_dd_percent = 10.0
                daily_dd_percent = 5.0
                profit_target_percent = 0.0
            else:
                max_dd_percent = rule.get("max_drawdown_percent", 10.0)
                daily_dd_percent = rule.get("daily_drawdown_percent", 5.0)
                profit_target_percent = rule.get("profit_target_percent", 0.0)
                if profit_target_percent <= 0.0:
                    ctype = meta.get('type', '').lower()
                    if 'phase_2' in ctype or 'phase 2' in ctype:
                        profit_target_percent = rule.get("profit_target_phase2_percent", 0.0)
                    else:
                        profit_target_percent = rule.get("profit_target_phase1_percent", 0.0)

        # --- ZERO EQUITY GLITCH PROTECTION ---
        # Sometimes MT5 Bridge returns 0 equity for a split second during sync or creation.
        # If Balance is healthy but Equity is ~0, we skip the check to avoid false breach.
        
        # Assumption: If equity is 0 but balance is > 1% of initial (or current if initial unknown), it's likely a glitch.
        # A real blowout usually kills balance too, or equity is just below limit, not exactly 0.
        
        # FIX V2: Also ignore if BOTH Equity and Balance are ~0 (Connection failure default)
        if equity <= 0.1:
            print(f"⚠️ [RiskEngine] IGNORED Low/Zero Equity Glitch for {login}. Eq: {equity}, Bal: {balance}")
            return

        # 1.5 WebSocket Broadcast (Unified Account Update)
        if self.ws_manager:
            import asyncio
            floating_pl = 0.0
            try:
                positions = self.worker.get_positions(login) or []
                for pos in positions:
                    floating_pl += float(getattr(pos, 'Profit', getattr(pos, 'profit', 0.0)))
            except: pass

            payload = {
                "event": "account_update",
                "login": login,
                "equity": equity,
                "floating_pl": round(floating_pl, 2),
                "trades_closed": False,
                "closed_count": 0,
                "timestamp": datetime.now().isoformat()
            }
            try:
                if getattr(self.ws_manager, 'main_loop', None):
                    import asyncio
                    asyncio.run_coroutine_threadsafe(
                        self.ws_manager.broadcast(login, payload), 
                        self.ws_manager.main_loop
                    )
            except Exception as e: 
                print(f"WS Broadcast error: {e}")

        # 2. OVERALL DRAWDOWN CHECK (Static Model vs Initial Balance)
        max_dd_limit = initial_balance * (1 - (max_dd_percent / 100.0))
        if equity <= max_dd_limit:
            self.trigger_breach(login, "Overall Drawdown", equity, balance, max_dd_limit, initial_balance)
            return

        # 3. DAILY DRAWDOWN CHECK
        # Priority 1: CRM provide SOD Equity
        # Priority 2: CRM provided Current Equity (Fallback for new accounts)
        # Priority 3: Initial Balance (Last resort)
        crm_sod = meta.get('start_of_day_equity')
        crm_current = meta.get('current_equity')
        
        start_equity = float(crm_sod if crm_sod is not None else (crm_current if crm_current is not None else initial_balance))

        # Formula: Limit Equity = SOD Equity * (1 - Daily_Drawdown_Percent / 100)
        daily_limit = start_equity * (1 - (daily_dd_percent / 100.0))
        
        if equity <= daily_limit:
            self.trigger_breach(login, "Daily Drawdown", equity, balance, daily_limit, start_equity)
            return

        # 4. PROFIT TARGET CHECK
        if profit_target_percent > 0:
            target_equity = initial_balance * (1 + (profit_target_percent / 100.0))
            if equity >= target_equity:
                self.trigger_pass(login, equity, balance, target_equity)

    def trigger_breach(self, login, risk_type, current_equity, current_balance, limit, reference_value):
        print(f"🛑 [RiskEngine] BREACH: {login} - {risk_type}. Eq: {current_equity} <= {limit}")
        
        # 3. Webhook to CRM
        payload = {
            "event": "account_breached",
            "login": login,
            "reason": f"{risk_type} Breach: Eq {current_equity} <= Limit {limit} (SOD: {reference_value})",
            "equity": current_equity,
            "balance": current_balance,
            "timestamp": datetime.now().isoformat()
        }
        
        headers = {"x-mt5-secret": MT5_WEBHOOK_SECRET} if MT5_WEBHOOK_SECRET else {}
        try:
            requests.post(CRM_WEBHOOK_URL, json=payload, headers=headers, timeout=5)
            print(f"📧 Breach Webhook sent for {login}")
        except Exception as e:
            print(f"❌ Webhook Failed for {login}: {e}")

    def trigger_pass(self, login, current_equity, current_balance, target):
        print(f"✅ [RiskEngine] PROFIT TARGET MET: {login}. Eq: {current_equity} >= {target}")
        payload = {
            "event": "account_passed",
            "login": login,
            "equity": current_equity,
            "balance": current_balance,
            "target": target,
            "timestamp": datetime.now().isoformat()
        }
        
        headers = {"x-mt5-secret": MT5_WEBHOOK_SECRET} if MT5_WEBHOOK_SECRET else {}
        try:
            requests.post(CRM_WEBHOOK_URL, json=payload, headers=headers, timeout=5)
            print(f"📧 Pass Webhook sent for {login}")
        except Exception as e:
            print(f"❌ Webhook Failed for {login}: {e}")
