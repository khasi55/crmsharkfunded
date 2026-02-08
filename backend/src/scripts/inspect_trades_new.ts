
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

let envPath = path.resolve(__dirname, '../../.env');
if (!fs.existsSync(envPath)) {
    envPath = path.resolve(__dirname, '../.env');
}
if (!fs.existsSync(envPath)) {
    envPath = path.resolve(__dirname, '../../../.env');
}
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing SUPABASE credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectTickets() {
    const tickets = [8027584, 8027586];
    console.log(`Fetching details for: ${tickets.join(', ')}`);

    const { data, error } = await supabase
        .from('trades')
        .select('*')
        .in('ticket', tickets);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!data.length) {
        console.log('No trades found.');
        return;
    }

    data.forEach(t => {
        console.log(JSON.stringify(t, null, 2));
    });
}

inspectTickets();
