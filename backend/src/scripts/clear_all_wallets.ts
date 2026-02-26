
import { supabase } from '../lib/supabase';

async function clearAllWallets() {
    console.log("🚀 Starting wallet address cleanup...");

    try {
        // We select first to see what we are deleting
        const { count, error: countError } = await supabase
            .from('wallet_addresses')
            .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        console.log(`📊 Found ${count} wallet addresses to remove.`);

        if (count === 0) {
            console.log("✅ No wallet addresses found. Cleanup complete.");
            return;
        }

        // Delete all rows
        const { error: deleteError } = await supabase
            .from('wallet_addresses')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything

        if (deleteError) throw deleteError;

        console.log("✅ Successfully cleared all wallet addresses.");

        // Optionally clear primary wallet flag from profiles if it exists there too
        // Based on previous checks, profiles only had a 'metadata' field that might contain info

    } catch (error: any) {
        console.error("❌ Cleanup failed:", error.message);
        process.exit(1);
    }
}

clearAllWallets();
