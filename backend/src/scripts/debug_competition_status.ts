import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseUrl || !supabaseKey) { console.error('Missing creds'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey) as any;

const COMPETITION_ID = '15579444-b28d-420d-aa40-c892b4551dd2';

async function checkStatus() {
    console.log(`Checking status for competition ${COMPETITION_ID}...`);
    console.log(`Current Server Time: ${new Date().toISOString()}`);

    const { data: comp, error } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', COMPETITION_ID)
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!comp) {
        console.log('Competition not found');
        return;
    }

    console.log('--- Competition Details ---');
    console.log(`Title: ${comp.title}`);
    console.log(`Status: ${comp.status}`);
    console.log(`Start Date: ${comp.start_date}`);
    console.log(`End Date:   ${comp.end_date}`);
    console.log(`Now:        ${new Date().toISOString()}`);

    const start = new Date(comp.start_date).getTime();
    const now = new Date().getTime();

    if (now >= start) {
        console.log('Analyis: Start time HAS passed.');
        if (comp.status !== 'active') {
            console.log('ISSUE: Status should be ACTIVE but is', comp.status);
        }
    } else {
        console.log('Analysis: Start time has NOT passed yet.');
        const diff = (start - now) / 1000 / 60;
        console.log(`Starts in ${diff.toFixed(2)} minutes.`);
    }
}

checkStatus();
