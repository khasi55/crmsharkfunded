process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!, {
  auth: { persistSession: false },
  global: {
    fetch: (...args) => {
      return fetch(...args).then(res => {
        if (!res.ok && res.status >= 500) {
           console.log("Fetch failed with status", res.status);
        }
        return res;
      });
    }
  }
});

async function main() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();
    
    console.log("Checking for accounts with status=breached today...");
    const { data: accounts, error } = await supabase
        .from('accounts')
        .select('id, status, updated_at')
        .eq('status', 'breached')
        .gte('updated_at', todayStr);

    if (error) {
        console.error('Error fetching accounts:', error.message || error);
    } else {
        console.log(`Accounts marked breached today: ${accounts?.length || 0}`);
    }

    const { data: challenges, error: cfErr } = await supabase
        .from('challenges')
        .select('id, status, updated_at')
        .in('status', ['breached', 'failed'])
        .gte('updated_at', todayStr);

    if (cfErr) {
         console.error('Error fetching challenges:', cfErr.message || cfErr);
    } else {
         console.log(`Challenges marked breached/failed today: ${challenges?.length || 0}`);
    }
}

main().catch(console.error);
