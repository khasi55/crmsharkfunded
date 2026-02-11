
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DIDIT_API_BASE_URL = 'https://verification.didit.me';
const DIDIT_API_KEY = process.env.DIDIT_CLIENT_SECRET;

async function fetchDiditSession(sessionId: string) {
    if (!DIDIT_API_KEY) {
        console.error("❌ Missing DIDIT_CLIENT_SECRET");
        return;
    }

    console.log(`🌍 Fetching FULL data from Didit for ${sessionId}...`);
    console.log(`🔑 Using Key: ${DIDIT_API_KEY.substring(0, 5)}...`);

    const endpoints = [
        `${DIDIT_API_BASE_URL}/v2/session/${sessionId}/decision`,
        `${DIDIT_API_BASE_URL}/v2/session/${sessionId}`,
        `${DIDIT_API_BASE_URL}/v1/session/${sessionId}/decision` // Try v1 as fallback
    ];

    for (const url of endpoints) {
        console.log(`\nTesting endpoint: ${url}`);

        // Try with Bearer
        try {
            console.log("  Attempting with Bearer Token...");
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${DIDIT_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log("  ✅ Success (Bearer)!");
            console.log("  Data:", JSON.stringify(response.data, null, 2));
            return;
        } catch (e: any) {
            console.log(`  ❌ Failed (Bearer): ${e.response?.status} - ${JSON.stringify(e.response?.data)}`);
        }

        // Try with X-Api-Key
        try {
            console.log("  Attempting with X-Api-Key...");
            const response = await axios.get(url, {
                headers: {
                    'X-Api-Key': DIDIT_API_KEY,
                    'Content-Type': 'application/json'
                }
            });
            console.log("  ✅ Success (X-Api-Key)!");
            console.log("  Data:", JSON.stringify(response.data, null, 2));
            return;
        } catch (e: any) {
            console.log(`  ❌ Failed (X-Api-Key): ${e.response?.status} - ${JSON.stringify(e.response?.data)}`);
        }
    }
}

fetchDiditSession('4550eddf-cc60-47b2-81e5-27772c2e93e2');
