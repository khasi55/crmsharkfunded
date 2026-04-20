import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config(); // Loads .env from cwd

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // Wednesday 4 PM IST
    const startDate = new Date('2026-04-01T16:00:00+05:30').toISOString();
    // End of Thursday IST
    const endDate = new Date('2026-04-02T23:59:59+05:30').toISOString();

    console.log(`Querying from ${startDate} to ${endDate}`);

    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching challenges:', error);
        return;
    }

    console.log(`Found ${challenges?.length || 0} challenges.`);
    
    if (challenges && challenges.length > 0) {
        const results = challenges.map((c: any) => ({
            accountNumber: c.login || c.challenge_number || c.id,
            equity: c.current_equity ?? c.current_balance ?? c.balance ?? 'N/A',
            startBalance: c.starting_balance ?? c.account_size ?? c.balance ?? 'N/A',
            createdAt: c.created_at
        }));
        
        console.table(results);
        
        // Write standard output to an artifact as well to ensure format is preserved
        const fs = require('fs');
        const path = require('path');
        const csvPath = path.join(process.cwd(), 'challenges_list.csv');
        let csv = 'Account Number,Starting Balance,Equity / Current Balance,Created At\n';
        results.forEach((r: any) => {
            csv += `${r.accountNumber},${r.startBalance},${r.equity},${r.createdAt}\n`;
        });
        fs.writeFileSync(csvPath, csv);
        console.log('CSV file successfully written to ' + csvPath);
    }
}

run();
