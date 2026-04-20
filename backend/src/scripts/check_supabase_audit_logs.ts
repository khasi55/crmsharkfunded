import { supabase } from '../lib/supabase';

async function check() {
    try {
        console.log("Checking security_logs for TJ7n4RQSE5dvxUxQbXB9PMZaeUuYhThX3Y (mass update execution)...");
        const { data, error } = await supabase
            .from('security_logs')
            .select('*')
            .limit(100)
            .order('created_at', { ascending: false });

        if (error) {
             console.log("No security_logs table accessible directly via this key", error.message);
        } else if (data) {
             console.log(`Found ${data.length} logs locally. Checking specific instances.`);
             console.log(data.filter((d: any) => JSON.stringify(d).includes("TJ7n4RQSE5dvxUxQbXB9PMZaeUuYhThX3Y")).slice(0, 5));
        }

    } catch (e: any) {
        console.error(e.message);
    }
}
check();
