
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase URL or Key in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function approveCommissions() {
    const userId = '04a05ed2-1e1d-45aa-86d2-d0572501e7ed'; // The Referrer
    console.log(`✅ Approving pending commissions for user: ${userId}`);

    const { data, error } = await supabase
        .from('affiliate_earnings')
        .update({ status: 'paid' })
        .eq('referrer_id', userId)
        .eq('status', 'pending')
        .select();

    if (error) {
        console.error('❌ Error approving:', error);
    } else {
        console.log(`💰 Approved ${data.length} records.`);
        data.forEach(d => console.log(`   - $${d.amount} (ID: ${d.id})`));
    }

    // Also update profile total if needed (optional, assuming trigger handles it or we do it manually)
    // Calculating total paid
    const { data: totalData } = await supabase
        .from('affiliate_earnings')
        .select('amount')
        .eq('referrer_id', userId)
        .eq('status', 'paid');

    if (totalData) {
        const total = totalData.reduce((sum, item) => sum + Number(item.amount), 0);
        console.log(`📊 Recalculated Total Paid: $${total}`);

        await supabase
            .from('profiles')
            .update({ total_commission: total })
            .eq('id', userId);

        console.log('✅ Profile total updated.');
    }
}

approveCommissions();
