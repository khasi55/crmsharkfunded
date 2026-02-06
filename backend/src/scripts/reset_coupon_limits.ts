
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function resetLimits() {
    console.log('🔄 Resetting max_uses_per_user to null for all coupons...');

    const { error } = await supabase
        .from('discount_coupons')
        .update({ max_uses_per_user: null })
        .eq('max_uses_per_user', 1);

    if (error) {
        console.error('❌ Failed to reset limits:', error.message);
    } else {
        console.log('✅ Successfully reset limits to unlimited for coupons that had 1-use limit.');
    }
}

resetLimits();
