
import dotenv from 'dotenv';
import path from 'path';
import { fetchMT5History } from './src/lib/mt5-bridge';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function checkBridge() {
    const login = 900909492845;
    console.log(`Fetching history for ${login} from bridge...`);

    try {
        const oneWeekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
        const history = await fetchMT5History(login, oneWeekAgo);

        if (!history || history.length === 0) {
            console.log("No trades found on bridge.");
            return;
        }

        console.log(`Bridge returned ${history.length} trades.`);

        let initialBalance = 5000;
        let equity = initialBalance;
        let minEquity = initialBalance;

        // Sort trades by time to simulate equity curve
        const sortedHistory = [...history].sort((a, b) => (a.time) - (b.time));

        console.log("\nTrade Log:");
        for (const t of sortedHistory) {
            const profit = Number(t.profit) + (Number(t.commission || 0) * 2) + Number(t.swap || 0);
            equity += profit;
            if (equity < minEquity) minEquity = equity;
            const timeStr = new Date(t.time * 1000).toISOString();
            const closeTimeStr = t.close_time ? new Date(t.close_time * 1000).toISOString() : 'OPEN';
            console.log(`[${timeStr}] Ticket ${t.ticket}: ${t.symbol} ${t.type} Lots ${t.volume / 10000} Profit ${profit.toFixed(2)}, Equity ${equity.toFixed(2)} (Closed: ${closeTimeStr})`);
        }

        console.log(`\nFinal Equity: ${equity.toFixed(2)}`);
        console.log(`Min Equity reached: ${minEquity.toFixed(2)}`);

        const sodEquity = 4807.66;
        const drawdownRule = 0.04;
        const threshold = sodEquity * (1 - drawdownRule);
        console.log(`Daily SOD Equity (from DB): ${sodEquity}`);
        console.log(`Daily Drawdown Rule: ${drawdownRule * 100}%`);
        console.log(`Breach threshold: ${threshold.toFixed(2)}`);

        if (minEquity < threshold) {
            console.log(`🛑 BREACH CONFIRMED: Min Equity ${minEquity.toFixed(2)} < Threshold ${threshold.toFixed(2)}`);
            console.log(`Max Daily Loss Amount: ${(sodEquity - minEquity).toFixed(2)} (Limit: ${(sodEquity * drawdownRule).toFixed(2)})`);
        } else {
            console.log(`✅ NO BREACH based on 4% rule: Min Equity ${minEquity.toFixed(2)} >= Threshold ${threshold.toFixed(2)}`);
        }

    } catch (e: any) {
        console.error('Error fetching from bridge:', e.message);
    }
}

checkBridge();
