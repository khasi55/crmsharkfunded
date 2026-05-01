const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();
    
    const [
        allRevenueData,
        monthBreachedData
    ] = await Promise.all([
        supabase.from('payment_orders').select('amount, payment_gateway').eq('status', 'paid').limit(10),
        supabase.from('challenges').select('updated_at').in('status', ['breached', 'failed']).gte('updated_at', thirtyDaysAgoStr).order('updated_at', { ascending: false }).limit(1000)
    ]);
    
    console.log("Revenue fetch error:", allRevenueData.error);
    console.log("Breached fetch error:", monthBreachedData.error);
    console.log("Breached count:", monthBreachedData.data?.length);

    const dateMap = new Map();
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        dateMap.set(key, { breachedAccounts: 0 });
    }

    monthBreachedData.data?.forEach(c => {
        const breachDate = new Date(c.updated_at);
        const key = breachDate.toISOString().split('T')[0];
        if (dateMap.has(key)) dateMap.get(key).breachedAccounts += 1;
    });

    const chartData = Array.from(dateMap.values());
    console.log("Are all zero?", chartData.every(d => d.breachedAccounts === 0));
}
run();
