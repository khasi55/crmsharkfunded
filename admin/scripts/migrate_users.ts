
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables manually
const envPath = path.resolve(__dirname, '../.env.local');
try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            process.env[key] = value;
        }
    });
} catch (error) {
    console.warn('Warning: Could not load .env.local file', error);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

const CONCURRENCY = 10; // Run 10 requests at a time

async function migrateUsers() {
    console.log('Starting optimized user migration...');

    while (true) {
        // 1. Fetch unsynced users in larger chunks
        const { data: users, error } = await supabase
            .from('userslist')
            .select('*')
            .is('synced_at', null)
            .is('migration_error', null)
            .limit(100); // Fetch 100 at a time

        if (error) {
            console.error('Error fetching users:', error);
            break;
        }

        if (!users || users.length === 0) {
            console.log('No more unsynced users found.');
            break;
        }

        console.log(`Processing batch of ${users.length} users with concurrency ${CONCURRENCY}...`);

        // Process batch with concurrency limit
        const results = [];
        for (let i = 0; i < users.length; i += CONCURRENCY) {
            const chunk = users.slice(i, i + CONCURRENCY);
            const promises = chunk.map(user => processUser(user));
            const chunkResults = await Promise.all(promises);
            results.push(...chunkResults);
            process.stdout.write('.'); // visuals
        }
        console.log('\nBatch complete.');
    }

    console.log('Migration finished.');
}

async function processUser(user: any) {
    try {
        // 2. Create Auth User
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password || 'TemporaryPassword123!',
            email_confirm: true,
            user_metadata: {
                full_name: user.name,
                phone: user.phone,
                user_type: user.user_type,
            },
        });

        if (authError) {
            if (authError.message.includes('already has been registered')) {
                await supabase
                    .from('userslist')
                    .update({ migration_error: 'User already exists' })
                    .eq('id', user.id);
                return;
            }
            throw authError;
        }

        const userId = authData.user?.id;
        if (userId) {
            // 3. Update Profiles
            await supabase.from('profiles').upsert({
                id: userId,
                full_name: user.name,
                phone: user.phone,
                user_type: user.user_type,
            });

            // 4. Mark as synced
            await supabase
                .from('userslist')
                .update({
                    synced_at: new Date().toISOString(),
                    auth_user_id: userId
                })
                .eq('id', user.id);
        }
    } catch (err: any) {
        // console.error(`\nFailed: ${user.email}: ${err.message}`);
        await supabase
            .from('userslist')
            .update({ migration_error: err.message })
            .eq('id', user.id);
    }
}

migrateUsers().catch(console.error);
