import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCounts() {
    console.log('Checking KYC counts...');

    // Check kyc_requests
    const { count: kycRequestsPending, error: error1 } = await supabase
        .from('kyc_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

    // Check kyc_sessions (pending)
    const { count: kycSessionsPending, error: error2 } = await supabase
        .from('kyc_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

    // Check kyc_sessions (requires_review)
    const { count: kycSessionsReview, error: error3 } = await supabase
        .from('kyc_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'requires_review');

    // Check payout_requests (all statuses)
    const { data: payoutStatuses, error: error4 } = await supabase
        .from('payout_requests')
        .select('status');

    const payoutCounts = payoutStatuses?.reduce((acc: any, curr: any) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
    }, {});

    console.log('kyc_requests (pending):', kycRequestsPending);
    console.log('kyc_sessions (pending):', kycSessionsPending);
    console.log('kyc_sessions (requires_review):', kycSessionsReview);
    console.log('payout_requests counts:', payoutCounts);

    if (error1) console.error('Error 1:', error1.message);
    if (error2) console.error('Error 2:', error2.message);
    if (error3) console.error('Error 3:', error3.message);
    if (error4) console.error('Error 4:', error4.message);
}

checkCounts();
