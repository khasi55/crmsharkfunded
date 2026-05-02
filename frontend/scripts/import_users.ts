
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse';

// --- CONFIGURATION ---
const BATCH_SIZE = 1000;
const TABLE_NAME = 'userslist';
// ---------------------

// Load environment variables from .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^['"]|['"]$/g, '');
            process.env[key] = value;
        }
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function importUsers() {
    // 1. Get CSV file from command line
    const csvFilePath = process.argv[2];
    if (!csvFilePath) {
        console.log('Usage: npx tsx scripts/import_users.ts <path-to-csv>');
        console.log('Example: npx tsx scripts/import_users.ts users.csv');
        process.exit(1);
    }

    if (!fs.existsSync(csvFilePath)) {
        console.error(`File not found: ${csvFilePath}`);
        process.exit(1);
    }

    console.log(`Reading ${csvFilePath}...`);

    // 2. Parse CSV
    const records: any[] = [];
    // Identify email duplicates within the CSV itself
    const seenEmails = new Set<string>();

    const parser = fs
        .createReadStream(csvFilePath)
        .pipe(parse({
            columns: true,
            skip_empty_lines: true,
            trim: true
        }));

    let duplicatesInCsv = 0;

    for await (const record of parser) {
        if (!record.email) continue;

        const email = record.email.toLowerCase();

        if (seenEmails.has(email)) {
            duplicatesInCsv++;
            // Skip duplicate in CSV
            continue;
        }
        seenEmails.add(email);

        records.push({
            name: record.name,
            email: email, // normalize email
            password: record.password,
            phone: record.phone,
            user_type: record.user_type || 'client',
            // Default migration status
            migration_error: null,
            synced_at: null
        });

        if (records.length >= BATCH_SIZE) {
            await processBatch(records.splice(0, records.length));
        }
    }

    // Process remaining
    if (records.length > 0) {
        await processBatch(records);
    }

    console.log(`\nImport complete.`);
    console.log(`Unique records imported/updated: ${seenEmails.size}`);
    console.log(`Duplicates skipped within CSV: ${duplicatesInCsv}`);
}

async function processBatch(batch: any[]) {
    process.stdout.write('.');
    // Upsert acts as "Insert or Update". 
    // If you strictly want "Insert or Skip", you can't easily do that with standard Supabase client in one batch
    // comfortably without 'ignoreDuplicates' option which works with 'onConflict'.

    const { error } = await supabase
        .from(TABLE_NAME)
        .upsert(batch, {
            onConflict: 'email',
            ignoreDuplicates: true
        });

    if (error) {
        console.error('\nBatch Error:', error.message);
    }
}

importUsers().catch(console.error);
