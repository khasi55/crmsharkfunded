
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkPaymentOrders() {
    const oldId = 'bb0c3755-5dd6-4086-86fd-53fbb50164af'; // sharmarakhisharm895@gmail.com (Yesterday typo)
    const newId = 'aac86649-ec00-4dbc-b4e7-550cc975c9d4'; // sharmarakhisharma895@gmail.com (Dec correct)

    console.log(`--- Checking Payment Orders ---`);

    const { data: oldOrders } = await supabase.from('payment_orders').select('*').eq('user_id', oldId);
    const { data: newOrders } = await supabase.from('payment_orders').select('*').eq('user_id', newId);

    console.log('Payment Orders for typo account (Yesterday):', oldOrders);
    console.log('Payment Orders for correct account (Dec):', newOrders);
}

checkPaymentOrders();
