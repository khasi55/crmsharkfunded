const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    let start = 0;
    let sum = 0;
    while (true) {
        let q = supabase.from('payment_orders').select('amount').eq('status', 'paid').range(start, start + 999);
        const { data, error } = await q;
        if (error) {
            console.error("Error:", error);
            break;
        }
        if (!data || data.length === 0) break;
        data.forEach(d => {
            sum += (Number(d.amount) || 0);
        });
        start += 1000;
        console.log(`Fetched ${start} rows, current sum: $${sum}`);
    }
    console.log(`Total sum: $${sum}`);
}
run();
