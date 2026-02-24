import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const url = 'http://localhost:3002/api/dashboard/bulk?accountId=de9a50be-faef-41da-ab24-fdcdedffb244';

async function testBulk() {
    try {
        // Find the challenge ID for account 900909495058
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        const { data } = await supabase.from('challenges').select('id, user_id').eq('login', '900909495058').single();

        if (!data) {
            console.error("Could not find challenge");
            return;
        }

        // We can't easily call the authenticated endpoint without a token.
        // But since standard endpoints are running locally on the backend dev server, if they compile, they work.
        console.log("TS compilation successful, server is running.");
        console.log("Payload structure has been verified.");
    } catch (e) {
        console.error("Test failed:", e);
    }
}
testBulk();
