
function calculateLimits(initialBalance: number, startOfDayEquity: number, dailyPercent: number, maxPercent: number) {
    const totalLimit = initialBalance * (1 - (maxPercent / 100));

    // NEW FORMULA: % of Start of Day Equity
    const dailyLimit = startOfDayEquity * (1 - (dailyPercent / 100));

    const effectiveLimit = Math.max(totalLimit, dailyLimit);

    return {
        totalLimit,
        dailyLimit,
        effectiveLimit
    };
}

// Test Case from User:
// SOD Equity (Feb 19): $10,511.08 → Daily Limit (4%): $10,090.64
const test1 = calculateLimits(10000, 10511.08, 4, 10);
console.log("Test Case 1 (User's Example):");
console.log(`SOD Equity: 10511.08, Daily%: 4%`);
console.log(`Expected Daily Limit: 10090.64`);
console.log(`Actual Daily Limit:   ${test1.dailyLimit.toFixed(2)}`);
console.log(`Effective Limit:      ${test1.effectiveLimit.toFixed(2)}`);
console.log(Math.abs(test1.dailyLimit - 10090.64) < 0.01 ? "✅ PASS" : "❌ FAIL");

// Test Case 2: Deep Drawdown
const test2 = calculateLimits(10000, 9500, 5, 10);
console.log("\nTest Case 2 (Deep Drawdown):");
console.log(`Initial: 10000, SOD: 9500, Daily%: 5%, Max%: 10%`);
console.log(`Total Limit (10% of 10k): 9000`);
console.log(`Daily Limit (5% of 9.5k): 9025`);
console.log(`Effective Limit (Stricter): ${test2.effectiveLimit.toFixed(2)}`);
console.log(test2.effectiveLimit === 9025 ? "✅ PASS" : "❌ FAIL");
