const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://qjshgyxbhjhpqaprfeob.supabase.co', 'sb_secret_laJUGdDTOKGr49iaTQN0CQ_CUHfuc5i');

async function run() {
    console.log('--- Challenge Status Breakdown ---');
    
    // 1. Get all distinct statuses and their counts
    const { data: statuses } = await supabase.from('challenges').select('status');
    const counts = {};
    statuses.forEach(s => {
        counts[s.status] = (counts[s.status] || 0) + 1;
    });
    console.log('Status Counts:', counts);

    // 2. Check upgraded_to counts
    const { count: upgradedToCount } = await supabase.from('challenges').select('*', { count: 'exact', head: true }).not('upgraded_to', 'is', null);
    console.log('Accounts with upgraded_to:', upgradedToCount);

    // 3. Check specific combinations
    // MT5 logic: status in (breached, failed, disabled, upgraded) OR upgraded_to is not null
    const mt5Breached = statuses.filter(s => 
        ['breached', 'failed', 'disabled', 'upgraded'].includes(s.status)
    ).length;
    
    // Wait, we need to check both status AND upgraded_to for the 5732 number
    const { data: allData } = await supabase.from('challenges').select('status, upgraded_to');
    const mt5LogicCount = allData.filter(a => 
        ['breached', 'failed', 'disabled', 'upgraded'].includes(a.status) || a.upgraded_to !== null
    ).length;
    console.log('MT5 "Breached" Logic Count:', mt5LogicCount);

    // Check if including "passed" gets us to 5732
    const withPassed = allData.filter(a => 
        ['breached', 'failed', 'disabled', 'upgraded', 'passed'].includes(a.status) || a.upgraded_to !== null
    ).length;
    console.log('With Passed Count:', withPassed);

    process.exit(0);
}
run();
