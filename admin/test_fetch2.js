const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();
    
    const { data: monthBreachedData, error } = await supabase.from('challenges').select('id, updated_at, status').in('status', ['breached', 'failed']).gte('updated_at', thirtyDaysAgoStr);
    
    console.log("Error:", error);
    console.log("Data count:", monthBreachedData?.length);
    if (monthBreachedData && monthBreachedData.length > 0) {
        console.log("Sample:", monthBreachedData[0]);
    }
}
run();
