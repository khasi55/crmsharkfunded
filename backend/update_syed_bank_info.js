
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateBankInfo() {
    const userId = 'b8fa7935-c8cc-494a-b628-7180515cb444';
    const email = 'syedazhar1997@gmail.com';
    const newBankName = 'HDFC Bank';
    const newAccountNumber = '50100380435055';
    const newIFSC = 'HDFC0001525';

    console.log(`Updating bank details for user: ${email} (${userId})...`);
    const { error: ubError } = await supabase
        .from('bank_details')
        .update({
            bank_name: newBankName,
            account_number: newAccountNumber,
            ifsc_code: newIFSC,
            swift_code: null,
            is_locked: true,
            updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

    if (ubError) {
        console.error('Error updating bank details:', ubError);
        return;
    }
    console.log('Bank details updated successfully.');

    // Verification
    console.log('\nVerifying updates...');
    const { data: updatedBank } = await supabase.from('bank_details').select('*').eq('user_id', userId).single();

    console.log('Updated Bank Details:', JSON.stringify(updatedBank, null, 2));
}

updateBankInfo();
