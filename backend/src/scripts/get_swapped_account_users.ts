import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '/Users/viswanathreddy/Desktop/Desktop - VISWANATH’s MacBook Pro/Sharkfunded/SharkfundedCRM/crmsharkfunded/.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getSwappedAccountEmails() {
    // Collect all new logins from both CSV files
    const csv1Path = '/Users/viswanathreddy/Desktop/Desktop - VISWANATH’s MacBook Pro/Sharkfunded/SharkfundedCRM/New1 (1).csv';
    const csv2Path = '/Users/viswanathreddy/Desktop/Desktop - VISWANATH’s MacBook Pro/Sharkfunded/SharkfundedCRM/ac.csv';

    // New1 (1).csv: col[0]=old, col[1]=new
    const content1 = fs.readFileSync(csv1Path, 'utf-8');
    const lines1 = content1.split('\n').filter(l => l.trim() !== '').slice(1);
    const newLogins1 = lines1.map(l => l.split(',')[1]?.trim()).filter(Boolean);

    // ac.csv: col[0]=old, col[1]=group, col[2]=new
    const content2 = fs.readFileSync(csv2Path, 'utf-8');
    const lines2 = content2.split('\n').filter(l => l.trim() !== '' && l.split(',')[0].trim() !== 'Auro');
    const newLogins2 = lines2.map(l => l.split(',')[2]?.trim()).filter(Boolean);

    const allNewLogins = [...new Set([...newLogins1, ...newLogins2])];
    console.log(`Total unique new logins to look up: ${allNewLogins.length}`);

    // Fetch challenges with their user info
    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('login, user_id')
        .in('login', allNewLogins);

    if (error) {
        console.error("Error fetching challenges:", error);
        return;
    }

    const userIds = [...new Set(challenges?.map(c => c.user_id).filter(Boolean))];
    console.log(`Unique user IDs found: ${userIds.length}`);

    // Fetch user profiles
    const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

    if (userError) {
        console.error("Error fetching users:", userError);
        return;
    }

    const userMap = new Map(users?.map(u => [u.id, u]));

    // Build final output
    const results: any[] = [];
    for (const challenge of (challenges || [])) {
        const user = userMap.get(challenge.user_id);
        if (user) {
            results.push({
                login: challenge.login,
                email: user.email,
                name: user.full_name || 'N/A'
            });
        }
    }

    // Deduplicate by email
    const unique = Array.from(new Map(results.map(r => [r.email, r])).values());

    console.log(`\n--- Swapped Account Users (${unique.length} unique users) ---`);
    unique.forEach(r => {
        console.log(`Name: ${r.name || 'N/A'} | Email: ${r.email} | Login: ${r.login}`);
    });

    // Write to CSV
    const header = 'Login,Name,Email';
    const rows = unique.map(r => `${r.login},"${r.name || ''}",${r.email}`);
    fs.writeFileSync('/Users/viswanathreddy/Desktop/Desktop - VISWANATH’s MacBook Pro/Sharkfunded/SharkfundedCRM/swapped_account_users.csv', [header, ...rows].join('\n'));
    console.log(`\nSaved to swapped_account_users.csv`);
}

getSwappedAccountEmails();
