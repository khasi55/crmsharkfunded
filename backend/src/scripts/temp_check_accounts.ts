import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Force load env
const possibleEnvPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'backend/.env'),
    '.env'
];

for (const envPath of possibleEnvPaths) {
    dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error(`Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAccount(email: string) {
    console.log(`\n=== Checking email: ${email} ===`);

    // Check public.users
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email);

    if (userError) console.error(`Error in 'users':`, userError.message);
    else console.log(`Users found:`, users?.length || 0, users);

    // Check profiles
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email);

    if (profileError) console.error(`Error in 'profiles':`, profileError.message);
    else console.log(`Profiles found:`, profiles?.length || 0, profiles);

    // If found, check related data
    const allUsers = [...(users || []), ...(profiles || [])];
    const uniqueIds = Array.from(new Set(allUsers.map(u => u.id)));

    for (const userId of uniqueIds) {
        console.log(`\nChecking data for User/Profile ID: ${userId}`);

        const tables = [
            { name: 'challenges', col: 'user_id' },
            { name: 'payment_orders', col: 'user_id' },
            { name: 'orders', col: 'user_id' },
            { name: 'kyc', col: 'user_id' },
            { name: 'payouts', col: 'user_id' },
            { name: 'referrals', col: 'referrer_id' },
            { name: 'referrals', col: 'referred_id', alias: 'referrals_referred' },
            { name: 'coupons', col: 'created_by' },
            { name: 'affiliate_earnings', col: 'affiliate_id' },
            { name: 'user_devices', col: 'user_id' },
            { name: 'user_ips', col: 'user_id' },
            { name: 'notifications', col: 'user_id' }
        ];

        for (const table of tables) {
            const { count, error } = await supabase
                .from(table.name)
                .select('*', { count: 'exact', head: true })
                .eq(table.col, userId);

            if (error) {
                // Ignore if table doesn't exist
                if (!error.message.includes('not find the table')) {
                    console.error(`Error in ${table.name} (${table.col}):`, error.message);
                }
            } else if (count && count > 0) {
                console.log(`- ${table.alias || table.name}: ${count}`);
            }
        }
    }
}

async function main() {
    await checkAccount('aimanjeeralbhavi@gmail.com');
    await checkAccount('aimanjeeralbhavi@gamil.com');
    await checkAccount('aaimanjeeralbhavi0@gmail.com');
}

main().catch(console.error);
