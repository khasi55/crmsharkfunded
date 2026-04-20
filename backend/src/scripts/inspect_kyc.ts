
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('Inspecting KYC sessions...');
    const { data: sessions, error } = await supabase
        .from('kyc_sessions')
        .select('*')
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Total sessions fetched:', sessions?.length);
    sessions?.forEach((s: any) => {
        console.log(`ID: ${s.id}, UserID: ${s.user_id}, Status: ${s.status}, DocType: ${s.document_type}, Mode: ${s.kyc_mode}`);
    });

    const userIds = sessions?.map((s: any) => s.user_id).filter(Boolean) || [];
    if (userIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);

        console.log('\nProfiles found:', profiles?.length);
        profiles?.forEach((p: any) => {
            console.log(`Profile ID: ${p.id}, Name: ${p.full_name}, Email: ${p.email}`);
        });
    }
}

inspect();
