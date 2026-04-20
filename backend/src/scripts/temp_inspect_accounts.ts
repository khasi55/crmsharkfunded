import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAccounts() {
    console.log("Fetching profiles matching kunnt% or kunth%...");
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', 'kunt%wealth3004@gmail.com')
        .or('email.ilike.kunth%wealth3004@gmail.com,email.ilike.kunnth%wealth3004@gmail.com');

    if (error) {
        console.error("Error fetching profiles:", error);
        return;
    }

    console.log(`Found ${profiles.length} profiles:`);
    for (const p of profiles) {
        console.log(`- ID: ${p.id} | Email: ${p.email} | Name: ${p.full_name} | Created: ${p.created_at}`);

        // Fetch Challenges
        const { data: challenges } = await supabase.from('challenges').select('id, login, challenge_type, status, created_at').eq('user_id', p.id);
        console.log(`  Challenges (${challenges?.length || 0}):`, challenges);

        // Fetch Orders
        const { data: orders } = await supabase.from('payment_orders').select('order_id, status, created_at').eq('user_id', p.id);
        console.log(`  Orders (${orders?.length || 0}):`, orders);

        console.log('---');
    }
}

inspectAccounts();
