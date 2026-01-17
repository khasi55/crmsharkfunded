import os
import time
import logging
from typing import List, Optional
from datetime import datetime

# --- MT5 API Wrappers ---
MT5_LIB = None

try:
    import MetaTrader5 as mt5
    MT5_LIB = True
    print("✅ MetaTrader5 package found.")
except ImportError:
    pass

class MT5Manager:
    """Class to hold MT5 Manager API Constants and Types"""
    
    class EnTradeActions:
        TA_DEALER_CLOSE = 200
        TA_STOPOUT_POSITION = 201
        TA_STOPOUT_ORDER = 202
    
    class EnMTAPIRetcode:
        MT_RET_OK = 0
        MT_RET_REQUEST_DONE = 10007
        MT_RET_ERROR = 1

    class MTRequest:
        def __init__(self):
            print("⚠️ Initializing Mock MTRequest")
            self.Action = 0
            self.Login = 0
            self.Symbol = ""
            self.Volume = 0
            self.Price = 0.0
            self.Position = 0
            self.Order = 0
            self.Type = 0
            self.TypeFilling = 0
            self.Comment = ""

    class MTConfirm:
        def __init__(self):
            print("⚠️ Initializing Mock MTConfirm")
            self.ResultRetcode = 0

class MT5Worker:
    def __init__(self):
        # Credentials are injected into os.environ by mt5_service.py (from Supabase)
        self._host = os.getenv("MT5_HOST", "127.0.0.1")
        self._login = int(os.getenv("MT5_LOGIN", "0"))
        self._password = os.getenv("MT5_PASSWORD", "")
        self._port = int(os.getenv("MT5_PORT", "443"))
        self._server = os.getenv("MT5_SERVER", "MetaQuotes-Demo")
        
        self.connected = False
        self._manager = None # For Manager API
        self._use_client_api = False # For Client API (MetaTrader5)
        
        logging.info(f"MT5Worker initialized. Target: {self._server} (Login: {self._login})")
        
        if self._login == 0:
            logging.warning("⚠️ MT5_LOGIN is 0. Configuration from Supabase might be missing or failed to load.")


    def connect(self):
        """Connect using available library"""
        print(f"📡 Connecting to MT5...")
        
        if not MT5_LIB:
            print("❌ ERROR: MetaTrader5 library not found!")
            print("❌ Please run: pip install -r requirements.txt")
            # If lib missing, force mock immediately
            self.connected = True
            self._manager = self._create_manager_mock()
            return True
        
        # Priority 1: Client API (MetaTrader5) - Terminal Connection
        if MT5_LIB:
            try:
                print("   👉 Attempting Client API (Terminal) connection...")
                # Initialize with login params if provided, otherwise default to running terminal
                if self._login and self._password:
                     authorized = mt5.initialize(
                        login=self._login, 
                        password=self._password, 
                        server=self._server
                     )
                else:
                     authorized = mt5.initialize()
                     
                if authorized:
                    self.connected = True
                    self._use_client_api = True
                    print("✅ MT5 Client Connected Successfully (Terminal)")
                    return True
                else:
                    print(f"   ❌ Client API Failed: {mt5.last_error()}")
            except Exception as e:
                print(f"   ❌ Client API Exception: {e}")

        # Fallback: Mock
        if self._host and self._login:
            print("⚠️ Falling back to MOCK MODE")
            self.connected = True
            self._manager = self._create_manager_mock()
            return True
            
        return False

    def _create_manager_mock(self):
        """Returns an object that mimics the MT5 Manager API"""
        class ManagerAPI:
            def UserRequest(self, login):
                class User:
                    def __init__(self, login):
                        self.Login = login
                        self.Equity = 100000.0
                        self.Balance = 100000.0
                        self.Group = "demo\\pro"
                        print(f"DEBUG: Mock User Created {login} with Eq {self.Equity}")
                        self.Enable = 1
                        self.Rights = 1
                        self.Comment = ""
                return User(login)
            def UserUpdate(self, user): return True
            def PositionRequest(self, login): return []
            def DealRequest(self, login, from_tm, to_tm): return []
            def OrderRequest(self, login): return []
            def DealerSend(self, req, res): 
                res.ResultRetcode = 0
                return True
            def DealerBalance(self, login, amount, type, comment=""): return True
            def PositionDelete(self, pos): return True
            def PositionDeleteByTicket(self, ticket): return True
            def OrderDelete(self, ticket): return True
            def UserLogins(self, group): return []
            def disconnect(self): pass
            
            # Helper for Symbol Info
            def SymbolInfoGet(self, symbol):
                class SymbolInfo:
                    Bid = 1.0
                    Ask = 1.0
                return SymbolInfo()
                
        return ManagerAPI()

    @property
    def manager(self):
        return self._manager

    def get_positions(self, login):
        """Fetch open positions"""
        if not self.connected: 
            print("⚠️ get_positions: Not connected")
            return []
        
        try:
            # Client API Logic
            if self._use_client_api:
                positions = mt5.positions_get(login=login)
                if positions is None:
                    # mt5.positions_get returns None if error
                    err = mt5.last_error()
                    if err[0] != 1: # 1 = Generic success? No, usually 0 is success, but None means failure.
                         print(f"   ⚠️ mt5.positions_get failed: {err}")
                    return []
                return positions

            # Manager API Logic
            if self._manager:
                return self._manager.PositionRequest(login) or []
                
        except Exception as e:
            print(f"Error getting positions: {e}")
            return []
        return []

    def get_deals(self, login, from_time, to_time):
        """Fetch history deals"""
        if not self.connected: 
            print("⚠️ get_deals: Not connected")
            return []
        
        try:
            # Client API Logic
            if self._use_client_api:
                deals = mt5.history_deals_get(login=login, date_from=datetime.fromtimestamp(from_time), date_to=datetime.fromtimestamp(to_time))
                if deals is None:
                    print(f"   ⚠️ mt5.history_deals_get failed: {mt5.last_error()}")
                    return []
                return deals

            # Manager API Logic
            if self._manager:
                return self._manager.DealRequest(login, from_time, to_time) or []
                
        except Exception as e:
            print(f"Error getting deals: {e}")
            return []
        return []

    def close_position(self, ticket):
        print(f"Worker: Closing ticket {ticket}")
        if self._use_client_api:
            # Implement mt5.order_send() if needed, but for now just logging
            pass
        return True

    def create_account(self, first, last, group, leverage, balance, callback_url=None):
        print(f"Worker: Creating account for {first} {last}")
        # Logic depends on API
        return {"login": 0, "password": "PW", "investor_password": "INV"}

    def get_group_users(self, group):
        """Fetch all users in a group with their equity/balance"""
        users = []
        if self._manager:
            # Assuming Manager API has UserLogins or similar
            # Real Manager API usually returns just logins, then we need UserRequest for each.
            # Start with getting logins
            try:
                logins = self._manager.UserLogins(group) or []
                for login in logins:
                    user_data = self._manager.UserRequest(login)
                    if user_data:
                         # Normalize to object
                         users.append({
                             "login": user_data.Login,
                             "group": user_data.Group,
                             "equity": user_data.Equity,
                             "balance": user_data.Balance
                         })
            except Exception as e:
                print(f"Error fetching group users {group}: {e}")
        
        # If using Client API (Terminal), we can only see OURSELF
        elif self._use_client_api:
            # We can only return the currently logged in user if they match the group
            # This is a limitation of Client API. 
            pass
            
        return users
