import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { login, trades } = body;

        // 🛡️ Security Check: Verify MT5 Secret before forwarding
        const authorizedSecret = process.env.MT5_WEBHOOK_SECRET;
        const receivedSecret = request.headers.get('x-mt5-secret') || request.headers.get('x-webhook-secret');

        if (authorizedSecret && authorizedSecret !== 'your_mt5_webhook_secret_here' && receivedSecret !== authorizedSecret) {
            const ip = request.headers.get('x-forwarded-for') || 'unknown';
            console.warn(`🛑 [Gateway] Blocked unauthorized MT5 webhook attempt from ${ip}`);
            return NextResponse.json({ error: 'Unauthorized: Invalid MT5 Secret' }, { status: 403 });
        }

        if (!login || !trades) {
            return NextResponse.json({ error: 'Missing login or trades' }, { status: 400 });
        }

        // Forward to local Backend (port 3001) to trigger High-Performance Risk Engine
        const backendEndpoint = 'http://localhost:3001/api/webhooks/mt5';

        try {
            const response = await fetch(backendEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-mt5-secret': process.env.MT5_WEBHOOK_SECRET || ''
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                console.log(`✅ [Gateway] Forwarded ${trades.length} trades for ${login} to Backend.`);
                return NextResponse.json({ success: true, forwarded: true });
            } else {
                const errText = await response.text();
                console.error(`❌ [Gateway] Backend rejected trade update: ${response.status}`, errText);
                return NextResponse.json({ error: 'Backend rejected update' }, { status: response.status });
            }
        } catch (fetchError: any) {
            console.error(`❌ [Gateway] Could not reach local backend at ${backendEndpoint}:`, fetchError.message);
            return NextResponse.json({ error: 'Backend unreachable' }, { status: 503 });
        }

    } catch (error: any) {
        console.error('Frontend MT5 Webhook error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
