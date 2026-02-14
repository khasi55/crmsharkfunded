
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from backend .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('🚀 Starting DELETE ALL PAYOUTS...');

    // Count first
    const { count, error: countError } = await supabase
        .from('payout_requests')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Error counting payouts:', countError);
        return;
    }

    console.log(`Found ${count} total payout requests.`);

    if (count === 0) {
        console.log('✅ No payouts to delete.');
        return;
    }

    // Delete all
    // Supabase delete requires a filter. To delete all, we can use neq 'id', '00000000-0000-0000-0000-000000000000' or generic logic
    // But usually .neq('id', '0') works if uuid. Or .gt('created_at', '1970-01-01')

    const { error: deleteError } = await supabase
        .from('payout_requests')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Assuming UUIDs

    if (deleteError) {
        console.error('Error deleting payouts:', deleteError);
    } else {
        console.log(`✅ Successfully deleted all payouts.`);
    }

    console.log('🎉 Cleanup Complete!');
}

main().catch(console.error);
