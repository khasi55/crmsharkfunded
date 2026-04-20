import { supabase } from '../lib/supabase';

async function check() {
    try {
        console.log("Checking security_logs for the malicious wallet address without JSON path...");
        
        // Use a broader search in case it was logged differently
        const { data, error } = await supabase
            .from('security_logs')
            .select('*')
            .textSearch('details', 'TJ7n4RQSE5dvxUxQbXB9PMZaeUuYhThX3Y')
            .order('created_at', { ascending: false });

        if (error) {
             console.log("Query error:", error.message);
        } else if (data && data.length > 0) {
             console.log(`Found ${data.length} logs matching the wallet.`);
             console.log(data);
        } else {
             console.log("No logs found in security_logs for this wallet via textSearch.");
        }
        
    } catch (e: any) {
        console.error(e.message);
    }
}
check();
