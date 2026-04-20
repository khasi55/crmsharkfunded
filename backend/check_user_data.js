
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load .env
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserData() {
    const users = [
        { email: 'somshekharpaled01@gmail.com', id: '822bae4d-6fbc-4b0a-a17d-a346aa7e0e10' },
        { email: 'somashekharpaled01@gmail.com', id: '6ad33fbc-02bf-419c-b01b-6d3a19cdfe89' }
    ];

    for (const user of users) {
        console.log(`\nUser: ${user.email} (${user.id})`);

        // Check challenges
        const { count: challengeCount, error: cError } = await supabase
            .from('challenges')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        if (cError) console.error(`Error checking challenges for ${user.email}:`, cError);
        else console.log(`Challenges: ${challengeCount}`);

        // Check orders
        const { count: orderCount, error: oError } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        if (oError) console.error(`Error checking orders for ${user.email}:`, oError);
        else console.log(`Orders: ${orderCount}`);

        // Check payouts (if table exists)
        const { count: payoutCount, error: pError } = await supabase
            .from('payouts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        if (!pError) console.log(`Payouts: ${payoutCount}`);
    }
}

checkUserData();
