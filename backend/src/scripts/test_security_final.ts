import axios from 'axios';

const BACKEND_URL = 'http://localhost:5000'; // Make sure backend is running

async function runSecurityTests() {
    console.log('--- 🛡️ FINAL SECURITY VERIFICATION ---');

    // 1. TEST: The $1 Coupon Bug Fix
    console.log('\n[TEST 1] Testing Coupon Recalculation ($700 - 50% = $350)...');
    try {
        const response = await axios.post(`${BACKEND_URL}/api/coupons/validate`, {
            code: 'holi',
            amount: 700,
            accountType: 'all'
        });
        
        const { discountAmount, finalAmount } = response.data;
        console.log(`✅ Result: Discount=$${discountAmount}, Final=$${finalAmount}`);
        if (finalAmount === 350) {
            console.log('✨ SUCCESS: Backend recalculated correctly to $350 (No more $1 bug!)');
        } else {
            console.error('❌ FAILED: Still showing incorrect amount:', finalAmount);
        }
    } catch (error: any) {
        console.error('❌ Coupon Test Error:', error.response?.data || error.message);
    }

    // 2. TEST: Interception Attack (Price Manipulation)
    console.log('\n[TEST 2] Testing Price Interception Attack (Trying to pay $10 for a $350 order)...');
    try {
        const payload = {
            orderId: 'TEST_' + Date.now(),
            amount: 10, // MANIPULATED PRICE
            currency: 'USD',
            type: 'instant',
            model: 'prime',
            size: 100000, // $700 account
            couponCode: 'holi', // 50% discount -> Expected $350
            customerName: 'Security Tester',
            customerEmail: 'test@example.com'
        };

        const response = await axios.post(`${BACKEND_URL}/api/payments/create-order`, payload);
        console.error('❌ FAILED: Backend accepted a manipulated price! Update failed.');
    } catch (error: any) {
        const errorMsg = error.response?.data?.error || error.message;
        console.log(`✅ Result: Backend rejected with error: "${errorMsg}"`);
        if (errorMsg.includes('Price mismatch')) {
            console.log('✨ SUCCESS: Interception attack BLOCKED by backend recalculation.');
        } else {
            console.log('⚠️ Notice: Unexpected error format, but request was rejected.');
        }
    }

    console.log('\n--- VERIFICATION FINISHED ---');
}

runSecurityTests();
