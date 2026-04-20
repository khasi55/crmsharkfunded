import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { pricingConfig, getConfigKey, getSizeKey } from '../config/pricing';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function simulate() {
    let metadata: any = {
        "coupon": "SHARK30",
        "platform": "mt5",
        "mt5_group": "demo\\S\\1-SF",
        "account_size": 25000,
        "account_type": "1-step-lite",
        "customerName": "Priyansu Paul",
        "customerEmail": "priyansu.paul012@gmail.com"
    };
    let amount = 0.30000000000001137;

    let model = (metadata?.model || '').toLowerCase();
    let type = (metadata?.type || '').toLowerCase();
    const size = metadata?.size || metadata?.account_size || 0;
    const couponCode = metadata?.coupon;

    if (!model && !type && metadata?.account_type) {
        const at = metadata.account_type.toLowerCase();
        if (at.includes('instant')) type = 'instant';
        else if (at.includes('1-step')) type = '1-step';
        else if (at.includes('2-step')) type = '2-step';

        if (at.includes('lite')) model = 'lite';
        else if (at.includes('prime')) model = 'prime';
    }

    const configKey = getConfigKey(type, model);
    const sizeKey = getSizeKey(size);
    let expectedBasePrice = 0;

    if (configKey && sizeKey) {
        const config = pricingConfig[configKey] as any;
        const sizeData = config[sizeKey];
        if (sizeData && sizeData.price) {
            expectedBasePrice = parseInt(sizeData.price.replace('$', ''));
        }
    }

    console.log('Expected Base Price:', expectedBasePrice);

    let discountAmount = 0;
    if (couponCode) {
        const { data, error } = await supabaseAdmin.rpc('validate_coupon', {
            p_code: couponCode.trim(),
            p_user_id: '00000000-0000-0000-0000-000000000000',
            p_amount: expectedBasePrice,
            p_account_type: 'all'
        });
        if (data && data[0] && data[0].is_valid) {
            discountAmount = data[0].discount_amount;
        }
        if (error) console.log('RPC Error:', error);
    }

    console.log('Discount Amount:', discountAmount);
    const expectedAmount = Math.max(0, expectedBasePrice - discountAmount);
    console.log('Expected Amount:', expectedAmount);
    console.log('Math.abs(amount - expectedAmount):', Math.abs(amount - expectedAmount));
    console.log('Would Block?', Math.abs(amount - expectedAmount) > 0.1);
}

simulate();
