import { NextResponse } from 'next/server';
import { MtApiClient } from '@/lib/mtapi/client';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, ...payload } = body;

        const client = new MtApiClient();

        if (action === 'connect') {
            const result = await client.connect({
                host: payload.host,
                port: parseInt(payload.port),
                user: payload.user,
                password: payload.password
            });
            return NextResponse.json(result);
        }

        if (action === 'summary') {
            if (!payload.id) {
                return NextResponse.json({ success: false, message: "Session ID required" }, { status: 400 });
            }
            const result = await client.getAccountSummary(payload.id);
            return NextResponse.json({ success: true, data: result });
        }

        return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
