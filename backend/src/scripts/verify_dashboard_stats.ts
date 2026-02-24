import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyStats() {
    console.log('Verifying Dashboard Stats logic...');

    // Dashboard logic:
    // supabase.from("kyc_sessions").select("*", { count: "exact", head: true }).in("status", ["pending", "requires_review"]),

    const { count: dashboardCount, error } = await supabase
        .from('kyc_sessions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'requires_review']);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log('Dashboard logic count:', dashboardCount);

    // Manual check of individual statuses
    const { count: pendingCount } = await supabase.from('kyc_sessions').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: reviewCount } = await supabase.from('kyc_sessions').select('*', { count: 'exact', head: true }).eq('status', 'requires_review');

    console.log('Pending status count:', pendingCount);
    console.log('Requires_review status count:', reviewCount);
    console.log('Sum:', (pendingCount || 0) + (reviewCount || 0));

    if (dashboardCount === (pendingCount || 0) + (reviewCount || 0)) {
        console.log('✅ Verification Successful: Dashboard count matches database state.');
    } else {
        console.log('❌ Verification Failed: Count mismatch.');
    }
}

verifyStats();
