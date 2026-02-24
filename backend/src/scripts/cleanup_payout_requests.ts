import { supabase } from '../lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function cleanupPayoutRequests() {
    console.log('🚀 Starting Payout & Affiliate Withdrawal Cleanup...');

    try {
        // 1. Delete standard payout requests
        console.log('⏳ Deleting all entries from payout_requests...');
        const { error: payoutError, count: payoutCount } = await supabase
            .from('payout_requests')
            .delete({ count: 'exact' })
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (payoutError) {
            console.error('❌ Error deleting payout_requests:', payoutError.message);
        } else {
            console.log(`✅ Successfully deleted ${payoutCount} payout requests.`);
        }

        // 2. Delete affiliate withdrawal requests
        console.log('⏳ Deleting all entries from affiliate_withdrawals...');
        const { error: affiliateError, count: affiliateCount } = await supabase
            .from('affiliate_withdrawals')
            .delete({ count: 'exact' })
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (affiliateError) {
            console.error('❌ Error deleting affiliate_withdrawals:', affiliateError.message);
        } else {
            console.log(`✅ Successfully deleted ${affiliateCount} affiliate withdrawal requests.`);
        }

        console.log('\n🏁 Cleanup completed successfully!');
    } catch (error: any) {
        console.error('💥 Unexpected error during cleanup:', error.message);
    }
}

cleanupPayoutRequests().catch(console.error);
