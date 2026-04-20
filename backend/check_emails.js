
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmails() {
    const email1 = 'somshekharpaled01@gmail.com';
    const email2 = 'somashekharpaled01@gmail.com';

    console.log(`Checking existence of:`);
    console.log(`1. ${email1}`);
    console.log(`2. ${email2}`);

    for (const email of [email1, email2]) {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('email', email)
            .maybeSingle();

        if (error) {
            console.error(`Error checking ${email}:`, error);
        } else if (data) {
            console.log(`Found: ID: ${data.id}, Email: ${data.email}, Name: ${data.full_name}`);
        } else {
            console.log(`Not found: ${email}`);
        }
    }
}

checkEmails();
