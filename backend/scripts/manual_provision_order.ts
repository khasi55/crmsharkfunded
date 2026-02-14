
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { createMT5Account } from '../src/lib/mt5-bridge';
import { EmailService } from '../src/services/email-service';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const orderId = 'SF1771061948087KQY7AOXT6';
    console.log(`🚀 Starting Manual Provision for Order ${orderId}...`);

    // 1. Fetch Order
    const { data: order, error: orderError } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('order_id', orderId)
        .single();

    if (orderError || !order) {
        console.error('❌ Order not found or error:', orderError);
        return;
    }

    if (order.is_account_created) {
        console.log('⚠️ Account already marked as created. Double check admin dashboard.');
        return;
    }

    // 2. Resolve User ID
    let userId = order.user_id;
    if (!userId) {
        const email = order.metadata?.customerEmail || order.metadata?.email;
        if (email) {
            const { data: user } = await supabase.from('profiles').select('id, full_name, email').ilike('email', email).maybeSingle();
            if (user) {
                userId = user.id;
                console.log(`✅ Resolved User ID: ${userId} (${user.email})`);

                // Update Order with User ID to prevent future issues
                await supabase.from('payment_orders').update({ user_id: userId }).eq('order_id', orderId);
            } else {
                console.error(`❌ Could not resolve user execution. Profile missing for ${email}`);
                return;
            }
        } else {
            console.error('❌ No email in metadata to resolve user.');
            return;
        }
    }

    // 3. Prepare MT5 Data
    const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', userId).maybeSingle();

    if (!profile) {
        console.error(`❌ Profile not found for userId: ${userId}`);
        return;
    }

    const fullName = profile.full_name || order.metadata?.customerName || 'Trader';
    const email = profile.email;

    // Resolve details just like webhook
    let model = (order.model || order.metadata?.model || 'lite').toLowerCase();
    let type = (order.metadata?.type || '1-step').toLowerCase();

    // Fallback logic
    if (order.metadata?.account_type) {
        const at = order.metadata.account_type.toLowerCase();
        if (at.includes('instant')) type = 'instant';
        else if (at.includes('1-step')) type = '1-step';
        else if (at.includes('2-step')) type = '2-step';

        if (at.includes('lite')) model = 'lite';
        else if (at.includes('prime')) model = 'prime';
    }

    // Construct Challenge Type string
    let challengeType = 'evaluation';
    const normalizedType = type.replace('-', '_').replace(' ', '_');
    if (normalizedType === '2_step') {
        challengeType = `${model}_2_step_phase_1`;
    } else {
        challengeType = `${model}_${normalizedType}`;
    }

    console.log(`🔧 Config: Model=${model}, Type=${type} => Challenge=${challengeType}`);

    const mt5Group = order.metadata?.mt5_group || 'demo\\forex';
    const leverage = 100;
    const accountSize = order.account_size || order.amount; // fallback if size missing? No amount is price.
    // Check metadata size
    const finalSize = order.account_size || order.metadata?.size || 0;

    if (finalSize === 0) {
        console.error('❌ Account Size is 0 or missing.');
        return;
    }

    console.log(`🔌 Creating MT5 Account: ${fullName} (${email}) - Group: ${mt5Group} - Size: ${finalSize}`);

    try {
        const mt5Data = await createMT5Account({
            name: fullName,
            email: email,
            group: mt5Group,
            leverage: leverage,
            balance: finalSize,
            callback_url: `${process.env.BACKEND_URL || 'https://api.sharkfunded.com'}/api/webhooks/mt5`
        }) as any;

        console.log(`✅ MT5 Account Created: ${mt5Data.login}`);

        // 4. Create Challenge Record
        const { data: challenge, error: challengeError } = await supabase
            .from('challenges')
            .insert({
                user_id: userId,
                challenge_type: challengeType,
                initial_balance: finalSize,
                current_balance: finalSize,
                current_equity: finalSize,
                start_of_day_equity: finalSize,
                status: 'active',
                login: mt5Data.login,
                master_password: mt5Data.password,
                investor_password: mt5Data.investor_password || '',
                server: mt5Data.server || 'ALFX Limited',
                platform: order.platform || 'MT5',
                leverage: leverage,
                group: mt5Group,
                metadata: {
                    ...order.metadata,
                    plan_type: `${model} ${type}` // Ensure plan_type is set for Admin dashboard filter we just fixed
                }
            })
            .select()
            .single();

        if (challengeError) {
            console.error('❌ Challenge Insert Error:', challengeError);
            return;
        }

        console.log(`✅ Challenge Record Created: ${challenge.id}`);

        // 5. Update Order
        await supabase.from('payment_orders').update({
            challenge_id: challenge.id,
            is_account_created: true,
            user_id: userId // Ensure persistence
        }).eq('order_id', orderId);

        console.log(`✅ Order Updated.`);

        // 6. Send Email
        console.log('📧 Sending Credentials Email...');
        await EmailService.sendAccountCredentials(
            email,
            fullName,
            String(mt5Data.login),
            mt5Data.password,
            mt5Data.server || 'ALFX Limited',
            mt5Data.investor_password
        );
        console.log('✅ Email Sent.');

    } catch (error: any) {
        console.error('❌ Provisioning Failed:', error);
    }
}

main().catch(console.error);
