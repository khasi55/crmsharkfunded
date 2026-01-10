using System;
using System.Net;
using System.IO;
using MetaQuotes.MT5CommonAPI;
using MetaQuotes.MT5ManagerAPI;

namespace SharkBridge
{
    class Program
    {
        // CONFIGURATION
        static string MT5_SERVER = "78.47.199.64:443";
        static ulong MT5_LOGIN = 1010; // REPLACE WITH YOUR MANAGER LOGIN
        static string MT5_PASSWORD = "manager_password"; // REPLACE WITH YOUR PASSWORD
        
        static CIMTManagerAPI m_manager;
        static CIMTRequest m_request;
        static CIMTConfirm m_confirm;

        static void Main(string[] args)
        {
            Console.WriteLine("🦈 SharkBridge: Starting C# MT5 Bridge...");

            // 1. Initialize MT5 Manager
            string error;
            if (!InitializeManager(out error))
            {
                Console.WriteLine($"❌ Init Failed: {error}");
                return;
            }

            // 2. Start HTTP Server
            StartWebServer();
        }

        static bool InitializeManager(out string error)
        {
            error = "";
            try
            {
                // Initialize Factory
                SMTManagerAPIFactory.Initialize(".\\"); // DLLs must be in current folder
                
                // Create Manager
                m_manager = SMTManagerAPIFactory.CreateManager(SMTManagerAPIFactory.ManagerAPIVersion, out MTRetCode ret);
                if (ret != MTRetCode.MT_RET_OK)
                {
                    error = $"CreateManager Failed: {ret}";
                    return false;
                }

                // Connect
                Console.WriteLine($"Connecting to {MT5_SERVER}...");
                ret = m_manager.Connect(MT5_SERVER, MT5_LOGIN, MT5_PASSWORD, null, CIMTManagerAPI.EnPumpModes.PUMP_MODE_USERS, 5000);
                if (ret != MTRetCode.MT_RET_OK)
                {
                    error = $"Connection Failed: {ret}";
                    return false;
                }

                // Allocate Request Objects
                m_request = m_manager.CreateRequest();
                m_confirm = m_manager.CreateConfirm();

                Console.WriteLine("✅ Connected to MT5 Manager!");
                return true;
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return false;
            }
        }

        static void StartWebServer()
        {
            HttpListener listener = new HttpListener();
            string url = "http://+:5001/"; // Listen on Port 5001
            listener.Prefixes.Add(url);
            listener.Start();
            Console.WriteLine($"🌐 Bridge Listening on {url}");
            Console.WriteLine("👉 Usage: http://localhost:5001/close?login=123&ticket=456&volume=1000");

            while (true)
            {
                try
                {
                    HttpListenerContext context = listener.GetContext();
                    ProcessRequest(context);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"request error: {ex.Message}");
                }
            }
        }

        static void ProcessRequest(HttpListenerContext context)
        {
            HttpListenerRequest req = context.Request;
            HttpListenerResponse resp = context.Response;

            string responseString = "{}";

            if (req.Url.AbsolutePath == "/close")
            {
                // Parse Params
                // login, ticket, volume
                string sLogin = req.QueryString["login"];
                string sTicket = req.QueryString["ticket"];
                string sVolume = req.QueryString["volume"];

                if (ulong.TryParse(sLogin, out ulong login) && 
                    ulong.TryParse(sTicket, out ulong ticket) &&
                    ulong.TryParse(sVolume, out ulong volume))
                {
                    bool success = ExecuteStopOut(login, ticket, volume, out string msg);
                    // Manual JSON (Zero Dependency)
                    responseString = string.Format("{{\"status\":\"{0}\", \"message\":\"{1}\"}}", success ? "success" : "error", msg);
                }
                else
                {
                    responseString = "{\"status\":\"error\", \"message\":\"Invalid parameters\"}";
                }
            }
            else
            {
                responseString = "{\"status\":\"ok\", \"message\":\"SharkBridge Running\"}";
            }

            byte[] buffer = System.Text.Encoding.UTF8.GetBytes(responseString);
            resp.ContentLength64 = buffer.Length;
            resp.OutputStream.Write(buffer, 0, buffer.Length);
            resp.OutputStream.Close();
        }

        static bool ExecuteStopOut(ulong login, ulong ticket, ulong volume, out string msg)
        {
            // Lock to ensure thread safety on single Manager instance
            lock (m_manager)
            {
                m_request.Clear();
                m_request.Action = CIMTRequest.EnTradeActions.TA_STOPOUT_POSITION;
                m_request.Login = login;
                m_request.Position = ticket;
                m_request.Volume = volume;
                m_request.Price = 0; // StopOut ignores price usually, or uses market
                m_request.Comment = "CRM StopOut";
                m_request.Type = CIMTRequest.EnOrderType.OP_SELL; // Placeholder, Dealer checks pos
                m_request.TypeFilling = CIMTRequest.EnOrderFilling.ORDER_FILLING_FOK;

                // Native calls do NOT need symbol/price usually for StopOut, but if they do, we can add.
                // For robustness, lets try TA_STOPOUT_POSITION first.

                Console.WriteLine($"Executing StopOut for {login} Ticket {ticket}...");

                MTRetCode ret = m_manager.DealerSend(m_request, m_confirm);
                
                if (ret == MTRetCode.MT_RET_OK || ret == MTRetCode.MT_RET_REQUEST_DONE)
                {
                    msg = $"Success: {ret}";
                    Console.WriteLine("   ✅ Success!");
                    return true;
                }
                else
                {
                    msg = $"Failed: {ret}";
                    Console.WriteLine($"   ❌ Failed: {ret}");
                    return false;
                }
            }
        }
    }
}
