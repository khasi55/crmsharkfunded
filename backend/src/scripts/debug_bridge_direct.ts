
import dotenv from 'dotenv';
import path from 'path';
import { fetchMT5Trades } from '../lib/mt5-bridge';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
    const login = 889224484;
    console.log(`Checking BRIDGE output for login: ${login}`);

    try {
        const trades = await fetchMT5Trades(login);
        console.log(`Bridge returned ${trades.length} trades.`);

        if (trades.length > 0) {
            console.log("Sample Trade (Raw from Bridge):");
            console.log(JSON.stringify(trades[0], null, 2));

            console.log("----------------------------------------------------------------");
            console.log("| Ticket | Symbol | Type (Raw) | Volume (Raw) | Profit |");
            console.log("----------------------------------------------------------------");
            trades.forEach((t: any) => {
                console.log(`| ${t.ticket} | ${t.symbol} | ${t.type} | ${t.volume} | ${t.profit} |`);
            });
        }
    } catch (error) {
        console.error("Bridge Error:", error);
    }
}

main();
