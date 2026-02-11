
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DIDIT_API_BASE_URL = 'https://verification.didit.me';
const DIDIT_API_KEY = process.env.DIDIT_CLIENT_SECRET;

async function fetchDiditSession(sessionId: string) {
    console.log(`🌍 Fetching FULL data from Didit for ${sessionId}...`);

    if (!DIDIT_API_KEY) {
        console.error("❌ Missing DIDIT_CLIENT_SECRET");
        return;
    }

    try {
        const response = await axios.get(
            `${DIDIT_API_BASE_URL}/v2/session/${sessionId}/decision/`,
            {
                headers: {
                    'Authorization': `Bearer ${DIDIT_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const data = response.data;
        console.log("✅ Didit Response (Full):", JSON.stringify(data, null, 2));

    } catch (error: any) {
        console.error("❌ Didit API Error:", error.response?.data || error.message);
    }
}

fetchDiditSession('4550eddf-cc60-47b2-81e5-27772c2e93e2');
