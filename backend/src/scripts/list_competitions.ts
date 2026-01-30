import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listCompetitions() {
    console.log('Listing Competitions...');
    const { data: competitions, error } = await supabase
        .from('competitions')
        .select('id, title, status, start_date');

    if (error) {
        console.error('Error fetching competitions:', error);
        return;
    }

    if (!competitions || competitions.length === 0) {
        console.log('No competitions found.');
        return;
    }

    competitions.forEach(comp => {
        console.log(`ID: ${comp.id} | Title: ${comp.title} | Status: ${comp.status} | Start: ${comp.start_date}`);
    });
}

listCompetitions();
