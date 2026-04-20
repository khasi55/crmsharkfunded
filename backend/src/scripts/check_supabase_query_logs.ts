import { supabase } from '../lib/supabase';

async function check() {
    try {
        console.log("Checking pg_stat_activity or similar for recent updates...");
        
        // This usually requires superuser access, but let's see if we can get anything 
        // from any available audit table or extension.
        const { data, error } = await supabase.rpc('get_recent_wallet_updates');
        
        if (error) {
             console.log("RPC get_recent_wallet_updates not found or error:", error.message);
        } else {
             console.log(data);
        }
    } catch (e: any) {
        console.error(e.message);
    }
}
check();
