
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
CRM_WEBHOOK_URL = os.environ.get("CRM_WEBHOOK_URL", "http://localhost:3001/api/mt5/webhook")

class RiskEngine:
    def __init__(self, mt5_worker, supabase_client=None):
        self.worker = mt5_worker
        self.supabase = supabase_client
        self.running = False
        self.thread = None
        self.lock = threading.Lock()
        
        # In-Memory State for Daily Equity
        # Key: login (int), Value: { "date": "YYYY-MM-DD", "equity": float }
        self.daily_equity_map = {} 
        
        # Funded Accounts Override Cache (Set of Logins)
        self.funded_cache = set()
        self.last_cache_refresh = 0
        self.CACHE_REFRESH_INTERVAL = 60 # Refresh every 60 seconds

        load_rules()
        self.refresh_funded_cache()

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.thread.start()
        print("🚀 [RiskEngine] Started Risk Monitor Thread")

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join()

    def _monitor_loop(self):
        while self.running:
            try:
                # Periodic Cache Refresh
                if time.time() - self.last_cache_refresh > self.CACHE_REFRESH_INTERVAL:
                    self.refresh_funded_cache()

                self.check_all_accounts()
            except Exception as e:
                print(f"⚠️ [RiskEngine] Error in loop: {e}")
            
            time.sleep(1.0) # Check every 1 second (High Frequency)

    def refresh_funded_cache(self):
        """Fetches active accounts that should have Funded Rules (10%/5%) instead of Group Rules"""
        if not self.supabase: return
        
        try:
            # Query for active challenges that are "funded" OR "instant" 
            # (Note: Instant usually implies 8% rule, but user wants OVERRIDE for "Funded" status. 
            # We assume database 'challenge_type' contains 'funded' for legit funded accounts)
            # Actually, per user request, we need to treat Passed Challenges (which become Funded) with 10% rule.
            # So we look for 'funded' in the type.
            
            response = self.supabase.table('challenges') \
                .select('login') \
                .eq('status', 'active') \
                .ilike('challenge_type', '%funded%') \
                .execute()
                
            if response.data:
                new_cache = set()
                for row in response.data:
                    if row.get('login'):
                        new_cache.add(int(row['login']))
                self.funded_cache = new_cache
                # print(f"✅ [RiskEngine] Refreshed Funded Cache: {len(self.funded_cache)} accounts")
            
            self.last_cache_refresh = time.time()
            
        except Exception as e:
            print(f"⚠️ [RiskEngine] Cache refresh failed: {e}")

    def check_all_accounts(self):
        # Iterate all groups defined in rules
        for group_name in rules_cache.keys():
            # Get users for this group from Worker
            # Escape backslashes for API call if needed, but rules_cache keys are raw
            users = self.worker.get_group_users(group_name)
            
            for user in users:
                # Convert dict to object-like if needed or just use dict access in check_user
                # Update check_user to handle dict
                self.check_user(user) 

    def check_user(self, user_info):
        """
        user_info: Dict { login, group, equity, balance, ... }
        """
        login = user_info.get('login')
        group = user_info.get('group')
        equity = user_info.get('equity')
        balance = user_info.get('balance')
        
        # 1. Get Rules
        rule = rules_cache.get(group)
        if not rule:
            # Try escaping backslashes if needed, or check fallback
            return

        # --- RULE OVERRIDE LOGIC ---
        if login in self.funded_cache:
            # Override for Funded Account (Passed Challenge)
            # Standard Funded Rules: 10% Max, 5% Daily
            max_dd_percent = 10.0
            daily_dd_percent = 5.0
            # print(f"ℹ️ [RiskEngine] Override Applied for {login}: 10%/5%")
        else:
            # Standard Group Rules (e.g. 8%/4% for Instant)
            max_dd_percent = rule.get("max_drawdown_percent", 10.0)
            daily_dd_percent = rule.get("daily_drawdown_percent", 5.0)

        reset_hour = rule.get("reset_hour_gmt", 0)

        # 2. Get Initial Balance (Approximation or tracked?)
        # For Max DD, we usually compare vs Initial Balance.
        # Ideally, user_info has 'initial_balance'. If not, we might use 'balance' from a "reset point"
        # BUT standard MT5 'balance' changes with closed trades. 
        # We need the ORIGINAL starting balance for Max Drawdown (Static Model) or High Watermark (Trailing).
        # Assumption: CRM sends "initial_balance" or we infer it.
        # For now, let's assume Static Model based on Tier (e.g. 100k account).
        
        # Simplified: Use current balance as proxy for Initial if no other data? 
        # NO, that resets risk on profit.
        # We need the "Entry Capital". 
        # If unavailable, we can't efficiently check MaxDD without CRM data.
        
        # --- ZERO EQUITY GLITCH PROTECTION ---
        # Sometimes MT5 Bridge returns 0 equity for a split second during sync or creation.
        # If Balance is healthy but Equity is ~0, we skip the check to avoid false breach.
        
        # Assumption: If equity is 0 but balance is > 1% of initial (or current if initial unknown), it's likely a glitch.
        # A real blowout usually kills balance too, or equity is just below limit, not exactly 0.
        
        # FIX V2: Also ignore if BOTH Equity and Balance are ~0 (Connection failure default)
        if equity <= 0.1:
            print(f"⚠️ [RiskEngine] IGNORED Low/Zero Equity Glitch for {login}. Eq: {equity}, Bal: {balance}")
            return

        # --- DAILY DRAWDOWN CHECK ---
        # 3. Check Daily Start Equity
        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y-%m-%d")
        
        # Update Daily Start if new day
        user_daily = self.daily_equity_map.get(login)
        start_equity = equity # Default
        
        if not user_daily or user_daily['date'] != today_str:
            # New Day (or first run)
            # Fetch 'Start of Day' from history? Or just use current if it's the reset hour?
            # This is the tricky part.
            # WORKAROUND: If we don't have it, we initialize it to current equity.
            # This effectively "Skips" daily DD check for the very first split second of run, 
            # but tracks it thereafter.
            self.daily_equity_map[login] = { "date": today_str, "equity": equity }
            start_equity = equity
        else:
            start_equity = user_daily['equity']

        # Calc Daily Limit
        daily_limit = start_equity * (1 - (daily_dd_percent / 100.0))
        
        if equity <= daily_limit:
            self.trigger_breach(login, "Daily Drawdown", equity, balance, daily_limit, start_equity)
            return

        # --- MAX DRAWDOWN CHECK ---
        # Assuming we can get 'initial_balance' or derived from group name?
        # e.g. "100K" -> 100,000. 
        # Let's trust logic provided or CRM.
        # For this snippet, I will check Max DD vs Balance (Trailing) or if we put Initial in the map.
        
        # Placeholder for MaxDD logic
        pass

    def trigger_breach(self, login, risk_type, current_equity, current_balance, limit, reference_value):
        print(f"🛑 [RiskEngine] BREACH DETECTED for {login}: {risk_type}")
        print(f"   Equity: {current_equity} <= Limit: {limit} (Ref: {reference_value})")

        # 1. Disable Account in MT5
        # self.worker.manager.UserAccountDisable(login) (Pseudocode)
        
        # 2. Close All Positions
        # self.worker.close_all_positions(login)
        
        # 3. Webhook to CRM
        payload = {
            "event": "account_breached",
            "login": login,
            "reason": f"{risk_type} Breach. Equity: {current_equity}, Limit: {limit}",
            "equity": current_equity,
            "balance": current_balance,
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            requests.post(CRM_WEBHOOK_URL, json=payload, timeout=5)
            print("✅ [RiskEngine] Webhook sent to CRM")
        except Exception as e:
            print(f"❌ [RiskEngine] Webhook Failed: {e}")

