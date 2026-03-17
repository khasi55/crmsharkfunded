import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const backendUrl = 'http://localhost:3001';

async function verifyValidation() {
    console.log('--- Verification: Price Manipulation Protection ---');

    const testOrder = {
        gateway: 'sharkpay',
        orderId: `TEST_VERIFY_${Date.now()}`,
        amount: 1.00, // MANIPULATED AMOUNT (Should be $125 or similar)
        currency: 'USD',
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        metadata: {
            type: '2-step',
            model: 'lite',
            size: 25000,
            platform: 'MT5'
        }
    };

    console.log(`Sending manipulated order: $${testOrder.amount} for 25K Lite 2-Step (Expected ~$125)`);

    try {
        const response = await fetch(`${backendUrl}/api/payments/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testOrder)
        });

        const data = await response.json() as any;

        if (response.status === 400 && data.error?.includes('Price mismatch')) {
            console.log('✅ SUCCESS: Backend rejected manipulated price.');
            console.log('Error message:', data.error);
        } else {
            console.error('❌ FAILURE: Backend did not reject manipulated price correctly.');
            console.log('Status:', response.status);
            console.log('Response:', data);
        }
    } catch (error) {
        console.error('Error during verification:', error);
    }

    console.log('\n--- Verification: Valid Order (No Coupon) ---');
    const validOrder = {
        ...testOrder,
        orderId: `TEST_VALID_${Date.now()}`,
        amount: 125.00 // CORRECT AMOUNT
    };

    try {
        const response = await fetch(`${backendUrl}/api/payments/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validOrder)
        });

        const data = await response.json() as any;

        if (response.ok && data.success) {
            console.log('✅ SUCCESS: Valid order accepted.');
        } else {
            console.error('❌ FAILURE: Valid order rejected.');
            console.log('Status:', response.status);
            console.log('Error:', data.error);
        }
    } catch (error) {
        console.error('Error during verification:', error);
    }
}

verifyValidation();
