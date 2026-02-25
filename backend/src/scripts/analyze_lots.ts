
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function analyzeLotSizes() {
    console.log('🔍 Analyzing Lot Sizes in Trades Table (FIXED COLUMN)...\n');

    // 1. Total count of trades with lots > 10
    const { count, error: countError } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true })
        .gt('lots', 10);

    if (countError) {
        console.error('Count Error:', countError);
    } else {
        console.log(`Trades with lots > 10: ${count}`);
    }

    // 2. Sample trades with lots > 10
    const { data: samples, error: dataError } = await supabase
        .from('trades')
        .select('ticket, lots, symbol, open_time, profit_loss')
        .gt('lots', 10)
        .limit(5);

    if (dataError) {
        console.error('Data Error:', dataError);
    } else {
        console.log('\nSamples of trades with lots > 10:');
        console.log(JSON.stringify(samples, null, 2));
    }

    // 3. Trades with lots = 0
    const { count: countZero, error: countZeroError } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true })
        .eq('lots', 0);

    if (countZeroError) {
        console.error('Count Zero Error:', countZeroError);
    } else {
        console.log(`\nTrades with lots = 0: ${countZero}`);
        const { data: samplesZero } = await supabase
            .from('trades')
            .select('ticket, lots, symbol, open_time, type, profit_loss')
            .eq('lots', 0)
            .limit(5);
        console.log('\nSamples of trades with lots = 0:');
        console.log(JSON.stringify(samplesZero, null, 2));
    }

}

analyzeLotSizes();
