
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function investigateHedging() {
    const targetTicket = '8075673';
    console.log(`🕵️ INVESTIGATING HEDGING FOR TICKET #${targetTicket}...\n`);

    // 1. Get Target Trade
    const { data: targetTrade } = await supabase
        .from('trades')
        .select('*')
        .eq('ticket', targetTicket)
        .single();

    if (!targetTrade) {
        console.error("❌ Target trade not found in DB.");
        return;
    }

    const accountId = targetTrade.challenge_id;
    const targetType = targetTrade.type === 0 || targetTrade.type === 'buy' ? 'buy' : 'sell';
    const oppositeType = targetType === 'buy' ? 'sell' : 'buy'; // We look for THIS type
    // Note: In MT5, 0=Buy, 1=Sell. If type is stored as int:
    const oppositeTypeInt = targetTrade.type === 0 ? 1 : 0;

    console.log(`📋 TARGET TRADE:`);
    console.log(`   Ticket: #${targetTrade.ticket}`);
    console.log(`   Symbol: ${targetTrade.symbol}`);
    console.log(`   Type:   ${targetType.toUpperCase()} (${targetTrade.type})`);
    console.log(`   Open:   ${targetTrade.open_time} (${new Date(targetTrade.open_time).getTime()})`);
    console.log(`   Close:  ${targetTrade.close_time} (${new Date(targetTrade.close_time).getTime()})`);
    console.log(`\n🔍 SEARCHING FOR OVERLAPPING '${oppositeType.toUpperCase()}' TRADES...`);

    // 2. Search for Overlaps
    // An overlap exists if:
    // ExistingTrade.Open < TargetTrade.Close  AND  (ExistingTrade.Close > TargetTrade.Open OR ExistingTrade.Close is NULL)

    // Fetch ALL trades for this account and symbol to filter in JS (safest for complex time logic)
    const { data: allTrades } = await supabase
        .from('trades')
        .select('*')
        .eq('challenge_id', accountId)
        .eq('symbol', targetTrade.symbol);

    if (!allTrades) {
        console.log("No other trades found.");
        return;
    }

    const tOpen = new Date(targetTrade.open_time).getTime();
    const tClose = targetTrade.close_time ? new Date(targetTrade.close_time).getTime() : Date.now();

    const overlapping = allTrades.filter(t => {
        if (String(t.ticket) === String(targetTicket)) return false; // Skip self

        // Check Type (Must be opposite)
        // Handle both string 'buy'/'sell' and int 0/1
        let tType = '';
        if (t.type === 0 || t.type === 'buy') tType = 'buy';
        else if (t.type === 1 || t.type === 'sell') tType = 'sell';

        if (tType !== oppositeType) return false;

        // Check Time Overlap
        const otherOpen = new Date(t.open_time).getTime();
        const otherClose = t.close_time ? new Date(t.close_time).getTime() : Date.now() + 999999999; // Future if open

        // Log logic for close calls
        // console.log(`   Comparing #${t.ticket}: Open ${otherOpen} vs Target Close ${tClose}`);

        // Overlap Condition:
        // Trade A starts before Trade B ends AND Trade A ends after Trade B starts
        const overlaps = (otherOpen < tClose) && (otherClose > tOpen);
        return overlaps;
    });

    if (overlapping.length === 0) {
        console.log(`✅ RESULT: NO HEDGING DETECTED. No overlapping ${oppositeType} trades found.`);
        console.log("   (This implies the violation might be a False Positive or the opposing trade was deleted/not synced yet)");
    } else {
        console.log(`🚨 RESULT: HEDGING DETECTED! Found ${overlapping.length} overlapping trades:`);
        overlapping.forEach(t => {
            console.log(`   - Ticket #${t.ticket} (${t.type})`);
            console.log(`     Open:  ${t.open_time}`);
            console.log(`     Close: ${t.close_time || 'OPEN'}`);
        });
    }
}

investigateHedging();
