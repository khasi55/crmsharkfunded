import { supabase } from '../lib/supabase';

async function fixOrder() {
    const orderId = 'SF-MANUAL-1771592141223';
    const newAmount = 34.22;
    const newCurrency = 'USD';

    console.log(`Fixing order ${orderId}...`);

    const { error } = await supabase
        .from('payment_orders')
        .update({
            amount: newAmount,
            currency: newCurrency,
            metadata: {
                manual_setup: true,
                customerName: 'Rushikesh Kumbhar',
                customerEmail: 'rushikumbhar1997@gmail.com',
                gateway: 'sharkpay',
                original_input: 3361,
                converted_to_inr: true
            }
        })
        .eq('order_id', orderId);

    if (error) {
        console.error('Error updating order:', error);
        return;
    }

    console.log('Order updated successfully.');
}

fixOrder();
