import { pricingConfig, getConfigKey, getSizeKey } from '../config/pricing';

// Mocking the behavior of payouts.ts for verification
function calculateSplit(challengeType: string) {
    const isBolt = challengeType === 'direct_funded';
    return isBolt ? 0.7 : 0.8;
}

function testLogic() {
    console.log("--- Testing Payout Logic ---");
    
    const cases = [
        { type: 'direct_funded', expected: 0.7, name: 'Bolt (direct_funded)' },
        { type: 'lite_2_step_phase_1', expected: 0.8, name: 'Standard Lite' },
        { type: 'prime_instant', expected: 0.8, name: 'Standard Prime' },
        { type: 'funded', expected: 0.8, name: 'Standard Funded' }
    ];

    cases.forEach(c => {
        const split = calculateSplit(c.type);
        const pass = Math.abs(split - c.expected) < 0.0001;
        console.log(`[${pass ? 'PASS' : 'FAIL'}] ${c.name}: Expected ${c.expected}, Got ${split}`);
    });

    console.log("\n--- Testing Metadata Calculation ---");
    const gross = 1000;
    cases.forEach(c => {
        const split = calculateSplit(c.type);
        const actualPayout = gross * split;
        const deduction = gross * (1 - split);
        console.log(`${c.name}: Gross $${gross} -> User Receives $${actualPayout}, Company Deducts $${deduction}`);
    });
}

testLogic();
