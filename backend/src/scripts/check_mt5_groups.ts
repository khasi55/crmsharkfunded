
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGroups() {
    const logins = [900909490707, 900909490701, 900909490699, 900909490696];

    const { data, error } = await supabase
        .from('challenges')
        .select('login, group, mt5_group, server, challenge_type')
        .in('login', logins);

    if (error) {
        console.error('Error fetching accounts:', error);
        return;
    }

    console.log('Account MT5 Group Data:');
    console.table(data);
}

checkGroups();
