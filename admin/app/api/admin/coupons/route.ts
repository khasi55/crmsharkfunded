import { NextRequest, NextResponse } from 'next/server';
import { fetchWithAuth } from "@/utils/fetch-with-auth";


export async function GET(request: NextRequest) {
    try {
        const response = await fetchWithAuth(`/api/admin/coupons`, {
            method: 'GET',
            cache: 'no-store'
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const response = await fetchWithAuth(`/api/admin/coupons`, {
            method: 'POST',
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
