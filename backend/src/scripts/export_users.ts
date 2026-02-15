
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';
import fs from 'fs';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportUsers() {
    console.log('🚀 Starting user export...');

    let allUsers: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        console.log(`Fetching page ${page + 1}...`);
        const { data, error } = await supabase
            .from('profiles')
            .select('full_name, email')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('❌ Error fetching users:', error);
            process.exit(1);
        }

        if (data && data.length > 0) {
            allUsers = [...allUsers, ...data];
            page++;
            if (data.length < pageSize) {
                hasMore = false;
            }
        } else {
            hasMore = false;
        }
    }

    console.log(`✅ Fetched ${allUsers.length} users.`);

    // Convert to CSV
    const header = 'Full Name,Email\n';
    const rows = allUsers.map(user => {
        const name = (user.full_name || '').replace(/"/g, '""');
        const email = (user.email || '').replace(/"/g, '""');
        return `"${name}","${email}"`;
    }).join('\n');

    const csvContent = header + rows;
    const outputPath = resolve(__dirname, '../../users_export_file.csv');

    fs.writeFileSync(outputPath, csvContent);
    console.log(`🎉 CSV file generated at: ${outputPath}`);
}

exportUsers().catch(err => {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
});
