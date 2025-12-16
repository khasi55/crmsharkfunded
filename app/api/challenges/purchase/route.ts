import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { type, model, size, platform, coupon } = body;

        // Basic validation
        if (!type || !model || !size || !platform) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Mock Account Generation
        const login = Math.floor(Math.random() * 90000000) + 10000000;
        const masterPassword = Math.random().toString(36).slice(-8).toUpperCase() + Math.random().toString(36).slice(-4); // e.g. X7Z9A1b2
        const investorPassword = Math.random().toString(36).slice(-8).toLowerCase();

        // Determine challenge type name
        let challengeType = 'Phase 1';
        if (type === '2-step') challengeType = 'Phase 1';
        if (type === '1-step') challengeType = 'Evaluation';
        if (type === 'Instant') challengeType = 'Instant';

        // Calculate initial values
        const initialBalance = Number(size);

        // Insert into database
        const { data, error } = await supabase
            .from('challenges')
            .insert({
                user_id: user.id,
                challenge_type: challengeType,
                initial_balance: initialBalance,
                current_balance: initialBalance,
                current_equity: initialBalance,
                status: 'active',
                // Credentials
                login: login,
                master_password: masterPassword,
                investor_password: investorPassword,
                server: 'SharkFunded-Demo',
                platform: platform,
                model: model,
                leverage: model === 'pro' ? 100 : 50, // Example logic
                metadata: {
                    plan_type: type,
                    coupon_used: coupon || null,
                    purchased_at: new Date().toISOString()
                }
            })
            .select()
            .single();

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            challenge: data,
            credentials: {
                login,
                masterPassword,
                investorPassword,
                server: 'SharkFunded-Demo',
                platform
            }
        });

    } catch (error) {
        console.error('Purchase error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
