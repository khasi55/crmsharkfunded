
import crypto from 'crypto';

const secret = 'b4730b85e53e75323cca0e2ed7723bd0c474043a902422c2f7ab66192d171806';
const reportedSig = '89bd366f9cef6f061d788ffd6e3ace76a35eabfb226aad61d8776acb05fa9b26';

// The payload seen in the logs
const payloadObj = {
    "event": "payment.success",
    "orderId": "SF-20260208-JOIF",
    "reference_id": "SFORD1770557831426e32fa6b5",
    "utr": "787987897987",
    "amount": "45",
    "status": "verified",
    "timestamp": "2026-02-08T13:37:41.281Z",
    "name": "Kutteddula kasi Viswanath reddy",
    "email": "khasireddy3@gmail.com"
};

// Try different stringification methods
const tests = [
    { name: 'JSON.stringify', data: JSON.stringify(payloadObj) },
    { name: 'Sorted Keys JSON', data: JSON.stringify(payloadObj, Object.keys(payloadObj).sort()) },
    { name: 'Empty Payload', data: '' },
    { name: 'Just orderId', data: 'SF-20260208-JOIF' }
];

console.log('Testing HMAC signatures:');
tests.forEach(t => {
    const hmac = crypto.createHmac('sha256', secret).update(t.data).digest('hex');
    console.log(`- ${t.name}: ${hmac}`);
    if (hmac === reportedSig) console.log('  ✅ MATCH FOUND!');
});

// Also test if the reported sig IS the secret (plain secret verification)
if (reportedSig === secret) {
    console.log('- Reported Sig is EXACTLY the secret.');
} else {
    console.log('- Reported Sig is NOT the secret.');
}
