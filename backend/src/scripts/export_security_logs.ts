
import { supabase } from '../lib/supabase';
import fs from 'fs';
import path from 'path';

async function exportLogs() {
    console.log('🚀 Starting Comprehensive Security Log Export...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportPath = path.join(process.cwd(), `security_audit_export_${timestamp}.json`);

    const tablesToExport = [
        'system_logs',
        'kyc_sessions',
        'affiliate_withdrawals',
        'payment_orders',
        'admin_users',
        'profiles',
        'api_sessions'
    ];

    const auditData: any = {
        metadata: {
            exportedAt: new Date().toISOString(),
            scope: 'Full Security Audit Export'
        },
        logs: {}
    };

    for (const table of tablesToExport) {
        process.stdout.write(`📦 Fetching ${table}... `);
        try {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(2000);

            if (error) {
                console.log(`❌ Error: ${error.message}`);
                auditData.logs[table] = { error: error.message };
            } else {
                // Redact sensitive info if needed (minimal redaction for internal audit)
                const redactedData = data.map((row: any) => {
                    const newRow = { ...row };
                    if (newRow.email && table === 'profiles') {
                        newRow.email = newRow.email.replace(/(.{3})(.*)(@.*)/, '$1***$3');
                    }
                    return newRow;
                });
                console.log(`✅ (${data.length} entries)`);
                auditData.logs[table] = redactedData;
            }
        } catch (err: any) {
            console.log(`❌ Unexpected Error: ${err.message}`);
        }
    }

    fs.writeFileSync(exportPath, JSON.stringify(auditData, null, 2));
    console.log(`\n🎉 Export complete! Saved to: ${exportPath}`);
}

exportLogs().catch(console.error);
