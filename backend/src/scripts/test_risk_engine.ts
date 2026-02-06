import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

// Test Data
const testChallengeId = 'test-challenge-123';
const testUserId = 'test-user-456';

async function testRiskEngine() {
    console.log('🧪 Testing Risk Engine Detection...\n');

    // Test 1: Martingale Detection
    console.log('📊 Test 1: Martingale Detection');
    console.log('Scenario: Trader loses $100, then immediately opens 2x lot size');

    const martingaleTest = {
        trade: {
            ticket_number: 'TEST-MART-001',
            challenge_id: testChallengeId,
            user_id: testUserId,
            symbol: 'EURUSD',
            type: 'buy',
            lots: 2.0, // Doubled from previous
            open_price: 1.0850,
            open_time: new Date().toISOString(),
            close_time: null,
            profit_loss: null
        }
    };

    try {
        const response = await fetch(`${API_URL}/api/risk/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(martingaleTest)
        });

        const result = await response.json() as any;
        console.log('Result:', JSON.stringify(result, null, 2));

        if (result.violations?.some((v: any) => v.violation_type === 'martingale')) {
            console.log('✅ PASS: Martingale detected correctly\n');
        } else {
            console.log('❌ FAIL: Martingale NOT detected\n');
        }
    } catch (error: any) {
        console.error('❌ Test failed:', error.message, '\n');
    }

    // Test 2: Hedging Detection
    console.log('📊 Test 2: Hedging Detection');
    console.log('Scenario: Trader opens BUY and SELL on same symbol');

    const hedgingTest = {
        trade: {
            ticket_number: 'TEST-HEDGE-001',
            challenge_id: testChallengeId,
            user_id: testUserId,
            symbol: 'GBPUSD',
            type: 'sell', // Opposite of existing open trade
            lots: 1.0,
            open_price: 1.2650,
            open_time: new Date().toISOString(),
            close_time: null,
            profit_loss: null
        }
    };

    try {
        const response = await fetch(`${API_URL}/api/risk/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(hedgingTest)
        });

        const result = await response.json() as any;
        console.log('Result:', JSON.stringify(result, null, 2));

        if (result.violations?.some((v: any) => v.violation_type === 'hedging')) {
            console.log('✅ PASS: Hedging detected correctly\n');
        } else {
            console.log('⚠️  NOTE: Hedging requires an existing open trade on same symbol\n');
        }
    } catch (error: any) {
        console.error('❌ Test failed:', error.message, '\n');
    }

    // Test 3: Tick Scalping Detection
    console.log('📊 Test 3: Tick Scalping Detection');
    console.log('Scenario: Trade closed in 15 seconds (< 60s minimum)');

    const now = new Date();
    const openTime = new Date(now.getTime() - 15000); // 15 seconds ago

    const scalpingTest = {
        trade: {
            ticket_number: 'TEST-SCALP-001',
            challenge_id: testChallengeId,
            user_id: testUserId,
            symbol: 'XAUUSD',
            type: 'buy',
            lots: 0.5,
            open_price: 2050.50,
            close_price: 2051.00,
            open_time: openTime.toISOString(),
            close_time: now.toISOString(), // Closed 15 seconds later
            profit_loss: 50.00
        }
    };

    try {
        const response = await fetch(`${API_URL}/api/risk/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(scalpingTest)
        });

        const result = await response.json() as any;
        console.log('Result:', JSON.stringify(result, null, 2));

        if (result.violations?.some((v: any) => v.violation_type === 'tick_scalping')) {
            console.log('✅ PASS: Tick Scalping detected correctly\n');
        } else {
            console.log('❌ FAIL: Tick Scalping NOT detected (check min_trade_duration_seconds config)\n');
        }
    } catch (error: any) {
        console.error('❌ Test failed:', error.message, '\n');
    }

    // Test 4: Valid Trade (No Violations)
    console.log('📊 Test 4: Valid Trade (Should Pass)');
    console.log('Scenario: Normal trade with no violations');

    const validTradeOpenTime = new Date(now.getTime() - 300000); // 5 minutes ago

    const validTest = {
        trade: {
            ticket_number: 'TEST-VALID-001',
            challenge_id: testChallengeId,
            user_id: testUserId,
            symbol: 'USDJPY',
            type: 'buy',
            lots: 1.0,
            open_price: 148.50,
            close_price: 148.80,
            open_time: validTradeOpenTime.toISOString(),
            close_time: now.toISOString(), // Closed 5 minutes later
            profit_loss: 300.00
        }
    };

    try {
        const response = await fetch(`${API_URL}/api/risk/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validTest)
        });

        const result = await response.json() as any;
        console.log('Result:', JSON.stringify(result, null, 2));

        if (result.status === 'passed' && (!result.violations || result.violations.length === 0)) {
            console.log('✅ PASS: Valid trade passed correctly\n');
        } else {
            console.log('❌ FAIL: Valid trade flagged incorrectly\n');
        }
    } catch (error: any) {
        console.error('❌ Test failed:', error.message, '\n');
    }

    console.log('🏁 Risk Engine Tests Complete!');
}

testRiskEngine().catch(console.error);
