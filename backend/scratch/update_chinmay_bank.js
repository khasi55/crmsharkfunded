
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateBankInfo() {
    const email = 'chinmaypatade185@gmail.com';
    const newBankName = 'DCB Bank';

    console.log(`Finding user: ${email}...`);
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

    if (pError || !profile) {
        console.error('Error finding user:', pError || 'User not found');
        return;
    }

    const userId = profile.id;
    console.log(`Updating bank name to "${newBankName}" for user_id: ${userId}...`);

    const { data, error: ubError } = await supabase
        .from('bank_details')
        .update({
            bank_name: newBankName,
            updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select();

    if (ubError) {
        console.error('Error updating bank details:', ubError);
        return;
    }
    
    if (data && data.length > 0) {
        console.log('Bank details updated successfully:', JSON.stringify(data[0], null, 2));
    } else {
        console.log('No bank details found to update for this user.');
    }
}

updateBankInfo();
