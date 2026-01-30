import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseUrl || !supabaseKey) { console.error('Missing creds'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey) as any;

const COMPETITION_ID = '15579444-b28d-420d-aa40-c892b4551dd2';

async function forceUpdateStatus() {
    console.log(`Force updating status for competition ${COMPETITION_ID}...`);
    const now = new Date().toISOString();

    const { data: updated, error } = await supabase
        .from('competitions')
        .update({ status: 'active' })
        .eq('id', COMPETITION_ID)
        .eq('status', 'upcoming')
        .lte('start_date', now)
        .select();

    if (error) {
        console.error('Error updating status:', error);
    } else if (updated && updated.length > 0) {
        console.log(`✅ Successfully updated status to ACTIVE for: ${updated[0].title}`);
    } else {
        console.log('No update performed. Either status is already active or start_date is in future.');
        // Double check just in case
        const { data: current } = await supabase.from('competitions').select('status, start_date').eq('id', COMPETITION_ID).single();
        console.log('Current State:', current);
    }
}

forceUpdateStatus();
