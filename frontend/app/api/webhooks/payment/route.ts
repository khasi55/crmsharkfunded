import { NextRequest, NextResponse } from 'next/server';

/**
 * MANUAL PROXY ROUTE
 * Forwards all webhook events from Frontend (Ngrok) -> Backend (Localhost)
 * Bypasses middleware and complex frontend logic.
 */

export async function POST(req: NextRequest) {
    console.log("🪝 [FRONTEND PROXY] Webhook POST received. Forwarding to Backend...");

    try {
        const body = await req.json();
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');

        // Forward critical headers
        const sig = req.headers.get('x-sharkpay-signature');
        if (sig) headers.set('x-sharkpay-signature', sig);

        const backendBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        const backendUrl = `${backendBase}/api/webhooks/payment`;

        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        console.log(`🪝 [FRONTEND PROXY] Backend responded with status: ${response.status}`);

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });

    } catch (error: any) {
        console.error("❌ [FRONTEND PROXY] Error forwarding webhook:", error);
        return NextResponse.json({ error: 'Proxy failed', details: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    // Forward GET redirects to Backend
    const url = new URL(req.url);
    const backendBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    const backendUrl = new URL(`${backendBase}/api/webhooks/payment`);

    // Copy query params
    url.searchParams.forEach((v, k) => backendUrl.searchParams.set(k, v));

    console.log(`🪝 [FRONTEND PROXY] Forwarding GET to: ${backendUrl.toString()}`);
    return NextResponse.redirect(backendUrl);
}
