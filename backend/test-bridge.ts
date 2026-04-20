
import { fetchMT5History } from './src/lib/mt5-bridge';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function test() {
    const login = 900909502783;
    const oneWeekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);

    console.log("Testing fetchMT5History (with timestamp)...");
    const tradesWithTs = await fetchMT5History(login, oneWeekAgo);
    console.log(`Received ${tradesWithTs.length} trades.`);

    console.log("Testing fetchMT5History (without timestamp)...");
    const tradesWithoutTs = await fetchMT5History(login, 0);
    console.log(`Received ${tradesWithoutTs.length} trades.`);
}

test();
