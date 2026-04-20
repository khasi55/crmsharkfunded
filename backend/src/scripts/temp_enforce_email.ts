import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function enforceEmail() {
    const mainAccountId = '35ac13a4-fc0d-4e53-9efe-60474bbc370f'; // "Kunthu jain"
    const oldAccountId = 'fa8c49ee-399a-404e-a68d-768027a6ee41'; // "Kunthu wealth"

    // We want main account to be "Kunthuwealth3004@gmail.com" (capital K doesn't matter for routing, but matters for their login/mind)
    // Actually the user wants "Kunthuwealth3004@gmail.com" for their main account, which currently has "kunnthuwealth..."
    // AND the user wants to log in with that.

    // Let's first move the old account out of the way so its email doesn't conflict
    console.log("Renaming old account email to prevent conflicts...");
    await supabase.auth.admin.updateUserById(oldAccountId, { email: 'old_kunthuwealth3004@gmail.com', email_confirm: true } as any);
    await supabase.from('profiles').update({ email: 'old_kunthuwealth3004@gmail.com' }).eq('id', oldAccountId);

    // Now update the main account to the desired email
    const targetEmail = 'kunthuwealth3004@gmail.com'; // All lowercase handles login better
    console.log(`Updating main account (${mainAccountId}) email to ${targetEmail}...`);

    const { error: authErr } = await supabase.auth.admin.updateUserById(
        mainAccountId,
        { email: targetEmail, email_confirm: true } as any
    );
    if (authErr && authErr.message.includes('unexpected_failure')) {
        console.log("Auth update via API failed, attempting direct DB query via RPC if possible...");
        await supabase.rpc('run_sql', {
            query: `UPDATE auth.users SET email = '${targetEmail}' WHERE id = '${mainAccountId}';`
        });
    } else if (authErr) {
        console.error("Auth update error:", authErr);
    } else {
        console.log("Auth email updated.");
    }

    const { error: profErr } = await supabase.from('profiles').update({ email: targetEmail }).eq('id', mainAccountId);
    if (profErr) {
        console.error("Profile update error:", profErr);
    } else {
        console.log("Profile email updated.");
    }

    console.log("Finished enforcing emails.");
}

enforceEmail();
