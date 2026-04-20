import fetch from 'node-fetch';

async function testPriceManipulation() {
    const backendUrl = 'http://localhost:3001';
    
    console.log('--- Testing Price Manipulation Protection ---');
    
    // Attempt to create a 100K Prime account (Price: $870) for only $1
    const manipulatedOrder = {
        gateway: 'sharkpay',
        orderId: 'FAKED_' + Date.now(),
        amount: 1, // Manipulated!
        currency: 'USD',
        customerEmail: 'fraud@example.com',
        customerName: 'Fraudster',
        metadata: {
            model: 'prime',
            type: '2-step',
            size: '100k'
        }
    };

    console.log(`Sending manipulated order: $1 for 100K account...`);
    
    try {
        const response = await fetch(`${backendUrl}/api/payments/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(manipulatedOrder)
        });

        const data = await response.json() as any;
        
        if (response.status === 400 && data.error && data.error.includes('Price mismatch')) {
            console.log('✅ SUCCESS: Backend blocked the price manipulation!');
            console.log('   Error Message:', data.error);
        } else {
            console.error('❌ FAILURE: Backend accepted manipulated price or returned wrong error!');
            console.log('   Status:', response.status);
            console.log('   Response:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('Error during test:', error);
    }
}

testPriceManipulation();
