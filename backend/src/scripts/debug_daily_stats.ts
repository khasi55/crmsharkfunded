const supabaseUrl = 'https://qjshgyxbhjhpqaprfeob.supabase.co';
const supabaseServiceRoleKey = 'sb_secret_laJUGdDTOKGr49iaTQN0CQ_CUHfuc5i'; // Using service role key from .env

/*
if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}
*/

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkDailyStats() {
    console.log('--- System Time Info ---');
    const now = new Date();
    console.log('Current System Time (new Date()):', now.toString());
    console.log('Current System Time (ISO):', now.toISOString());
    console.log('Timezone Offset:', now.getTimezoneOffset());

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    console.log('Calculated startOfDay:', startOfDay.toString());
    console.log('Calculated startOfDay (ISO):', startOfDay.toISOString());

    console.log('\n--- Fetching Recent Payments ---');

    // Fetch payments created in the last 2 days to see timestamps
    const { data: payments, error } = await supabase
        .from('payment_orders')
        .select('id, amount, created_at, status')
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching payments:', error);
        return;
    }

    console.log(`Found ${payments?.length} recent payments:`);

    let dailyTotal = 0;

    payments?.forEach(p => {
        const paymentDate = new Date(p.created_at);
        const isToday = paymentDate >= startOfDay;

        console.log(`- Payment ID: ${p.id}, Amount: ${p.amount}, Created At: ${p.created_at} (${paymentDate.toString()})`);
        console.log(`  -> Is Today? ${isToday ? 'YES' : 'NO'}`);

        if (isToday) {
            dailyTotal += Number(p.amount);
        }
    });

    console.log('\n--- Calculated Daily Total ---');
    console.log(`Daily Total based on local startOfDay: ${dailyTotal}`);
}

checkDailyStats();
