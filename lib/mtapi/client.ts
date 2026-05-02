import { Mt5AccountSummary, Mt5ConnectionRequest, Mt5ConnectionResponse, Mt5Order } from "./types";

export class MtApiClient {
    private baseUrl: string;
    private token?: string;

    constructor(baseUrl: string = "https://mt5.mtapi.io") {
        this.baseUrl = baseUrl;
    }

    /**
     * Connects to the MT5 account.
     * Note: In a real scenario, this might return a session ID/Token to be used in future requests.
     */
    async connect(req: Mt5ConnectionRequest): Promise<Mt5ConnectionResponse> {
        try {
            const url = new URL(`${this.baseUrl}/Connect`);
            url.searchParams.append("host", req.host);
            url.searchParams.append("port", req.port.toString());
            if (req.user) url.searchParams.append("user", req.user);
            if (req.password) url.searchParams.append("password", req.password);

            console.log("Connecting to:", url.toString());
            const response = await fetch(url.toString(), {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const text = await response.text();
                console.error("MTAPI Error Response:", text);
                return {
                    id: "",
                    success: false,
                    message: `Connection failed: ${response.status} ${response.statusText} - ${text}`,
                };
            }

            const data = await response.json();
            console.log("MTAPI Connect Success Data:", data);
            return {
                id: data.id || "",
                success: true,
                message: "Connected successfully",
            };

        } catch (error: any) {
            console.error("MTAPI System Error:", error);
            return {
                id: "",
                success: false,
                message: error.message || "Unknown error during connection",
            };
        }
    }

    /**
     * Fetch Account Summary
     * @param id The session ID returned from connection
     */
    async getAccountSummary(id: string): Promise<Mt5AccountSummary | null> {
        try {
            const url = new URL(`${this.baseUrl}/AccountSummary`);
            url.searchParams.append("id", id);

            const response = await fetch(url.toString());
            if (!response.ok) return null;

            const data = await response.json();
            return {
                balance: data.Balance,
                equity: data.Equity,
                margin: data.Margin,
                freeMargin: data.FreeMargin,
                marginLevel: data.MarginLevel,
                currency: data.Currency,
                leverage: data.Leverage,
                name: data.Name,
                login: data.Login
            };
        } catch (error) {
            console.error("Failed to fetch account summary", error);
            return null;
        }
    }

    /**
     * Fetch Opened Orders
     * @param id The session ID returned from connection
     */
    async getOpenedOrders(id: string): Promise<Mt5Order[]> {
        try {
            const url = new URL(`${this.baseUrl}/OpenedOrders`);
            url.searchParams.append("id", id);

            const response = await fetch(url.toString());
            if (!response.ok) return [];

            const data = await response.json();
            // Transform to our internal type
            return data.map((o: any) => ({
                ticket: o.Ticket,
                symbol: o.Symbol,
                type: o.Type === 0 ? 'buy' : 'sell', // Simplified mapping, verify API constants
                lots: o.Lots,
                openPrice: o.OpenPrice,
                closePrice: 0, // Opened orders don't have close price usually
                openTime: o.OpenTime,
                profit: o.Profit,
                commission: o.Commission,
                swap: o.Swap,
                stopLoss: o.StopLoss,
                takeProfit: o.TakeProfit
            }));
        } catch (error) {
            console.error("Failed to fetch opened orders", error);
            return [];
        }
    }
}
