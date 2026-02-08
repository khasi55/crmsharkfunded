
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { AdvancedRiskEngine } from '../engine/risk-engine-advanced';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function simulateComplexRisk() {
    console.log("🧪 Starting Complex Risk Simulation (Martingale & Hedging)...");

    const advancedEngine = new AdvancedRiskEngine(supabase);

    // MOCK RULES: Explicitly ban Martingale and Hedging
    // (We iterate as if these columns existed and were set to FALSE)
    const strictRules = {
        allow_weekend_trading: true,
        allow_news_trading: true,
        allow_ea_trading: true,
        min_trade_duration_seconds: 0,
        max_single_win_percent: 50,
        // NEW FLAGS (Mocked)
        allow_martingale: false,
        allow_hedging: false
    };

    // --- TEST 1: MARTINGALE ---
    console.log("\n--- Test 1: Martingale (Revenge Trading) ---");
    // Scenario: User loses a trade, then immediately opens a larger one
    const now = Date.now();

    // Trade 1: LOSING Trade (Closed 2 mins ago)
    const losingTrade = {
        ticket_number: "1001",
        symbol: "EURUSD",
        type: 'buy',
        lots: 1.0,
        profit_loss: -500, // LOSS
        open_time: new Date(now - 10 * 60 * 1000), // Opened 10 mins ago
        close_time: new Date(now - 2 * 60 * 1000)   // Closed 2 mins ago
    };

    // Trade 2: REVENGE Trade (Just Opened, Larger Size)
    const revengeTrade = {
        challenge_id: "test_challenge",
        user_id: "test_user",
        ticket_number: "1002",
        symbol: "EURUSD",
        type: 'buy',
        lots: 2.0, // DOUBLED SIZE
        profit_loss: 0,
        open_time: new Date(now), // Opened NOW
        close_time: undefined
    };

    // To check Martingale, we pass "Todays Trades" which includes the losing trade
    const todaysTrades = [losingTrade];

    // NOTE: We need to cast strictRules because types aren't updated yet
    const martingaleViolations = await advancedEngine.checkBehavioralRisk(
        revengeTrade as any,
        strictRules as any,
        todaysTrades as any,
        [] // No open trades for this test
    );

    if (martingaleViolations.some(v => v.violation_type === 'martingale')) {
        console.log("✅ Martingale DETECTED");
    } else {
        console.log("❌ Martingale MISSED");
    }

    // --- TEST 2: HEDGING ---
    console.log("\n--- Test 2: Hedging ---");
    // Scenario: User has a BUY open, and opens a SELL on same symbol

    // Trade 1: Open BUY
    const openBuy = {
        ticket_number: "2001",
        symbol: "GBPUSD",
        type: 'buy',
        lots: 1.0,
        open_time: new Date(now - 30 * 60 * 1000),
        close_time: undefined // Still Open
    };

    // Trade 2: New SELL (Hedging)
    const newSell = {
        challenge_id: "test_challenge",
        user_id: "test_user",
        ticket_number: "2002",
        symbol: "GBPUSD",
        type: 'sell', // OPPOSITE
        lots: 1.0,
        open_time: new Date(now),
        close_time: undefined
    };

    // Pass openBuy in "Open Trades" list
    const openTrades = [openBuy];

    const hedgingViolations = await advancedEngine.checkBehavioralRisk(
        newSell as any,
        strictRules as any,
        [],
        openTrades as any
    );

    if (hedgingViolations.some(v => v.violation_type === 'hedging')) {
        console.log("✅ Hedging DETECTED");
    } else {
        console.log("❌ Hedging MISSED");
    }
}

simulateComplexRisk();
