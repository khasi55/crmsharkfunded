
import { supabase } from '../lib/supabase';

async function checkHedging() {
    const challengeId = '5073294e-66ee-45c1-ade0-3992a6431109'; // ID for 900909491276
    console.log(`🔍 Checking hedging for challenge ${challengeId}...`);

    // Fetch all trades
    const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('open_time', { ascending: true });

    if (error) {
        console.error('❌ Error fetching trades:', error);
        return;
    }

    if (!trades || trades.length === 0) {
        console.log('ℹ️ No trades found.');
        return;
    }

    console.log(`Found ${trades.length} trades. Analyzing for overlapping Buy/Sell...`);

    const symbols = [...new Set(trades.map(t => t.symbol))];
    let hedgingDetected = false;

    for (const symbol of symbols) {
        const symbolTrades = trades.filter(t => t.symbol === symbol);
        const buys = symbolTrades.filter(t => t.type === 'buy' || t.type === 0); // 0 is often Buy in MT5
        const sells = symbolTrades.filter(t => t.type === 'sell' || t.type === 1); // 1 is often Sell in MT5

        if (buys.length === 0 || sells.length === 0) continue;

        // Check for overlaps
        for (const buy of buys) {
            const buyOpen = new Date(typeof buy.open_time === 'number' ? buy.open_time * 1000 : buy.open_time).getTime();
            const buyCloseRaw = buy.close_time && buy.close_time !== 0 && buy.close_time !== '1970-01-01T00:00:00.000Z'
                ? buy.close_time
                : new Date().toISOString();
            const buyClose = new Date(typeof buyCloseRaw === 'number' ? buyCloseRaw * 1000 : buyCloseRaw).getTime();

            for (const sell of sells) {
                const sellOpen = new Date(typeof sell.open_time === 'number' ? sell.open_time * 1000 : sell.open_time).getTime();
                const sellCloseRaw = sell.close_time && sell.close_time !== 0 && sell.close_time !== '1970-01-01T00:00:00.000Z'
                    ? sell.close_time
                    : new Date().toISOString();
                const sellClose = new Date(typeof sellCloseRaw === 'number' ? sellCloseRaw * 1000 : sellCloseRaw).getTime();

                // Overlap Logic: StartA < EndB && StartB < EndA
                if (buyOpen < sellClose && sellOpen < buyClose) {
                    console.log(`⚠️ HEDGING DETECTED on ${symbol}!`);
                    console.log(`   Buy Ticket ${buy.ticket}: Open ${new Date(buyOpen).toISOString()} - Close ${new Date(buyClose).toISOString()}`);
                    console.log(`   Sell Ticket ${sell.ticket}: Open ${new Date(sellOpen).toISOString()} - Close ${new Date(sellClose).toISOString()}`);
                    hedgingDetected = true;
                }
            }
        }
    }

    if (!hedgingDetected) {
        console.log('✅ No hedging detected.');
    }
}

checkHedging();
