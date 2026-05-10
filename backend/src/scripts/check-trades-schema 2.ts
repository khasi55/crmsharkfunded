import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTradesSchema() {
    const { data: trade } = await supabase
        .from('trades')
        .select('*')
        .limit(1)
        .single();

    if (trade) {
        console.log('Columns in trades table:', Object.keys(trade));
    } else {
        console.log('No trades found');
    }
}

checkTradesSchema();
