import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Currency Conversion API
 * Used by payment gateways to convert USD to other currencies
 */
export async function POST(request: NextRequest) {
    try {
        const { amount, from, to } = await request.json();

        if (!amount || !from || !to) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // If same currency, no conversion needed
        if (from === to) {
            return NextResponse.json({ convertedAmount: amount });
        }

        const supabase = await createClient();

        // Fetch conversion rate
        const { data: rateData } = await supabase
            .from('currency_rates')
            .select('rate')
            .eq('from_currency', from)
            .eq('to_currency', to)
            .eq('is_active', true)
            .single();

        const rate = rateData?.rate || 1;
        const convertedAmount = Math.round(amount * rate);

        return NextResponse.json({
            originalAmount: amount,
            convertedAmount: convertedAmount,
            rate: rate,
            from: from,
            to: to,
        });

    } catch (error) {
        console.error('Conversion error:', error);
        return NextResponse.json({ error: 'Conversion failed' }, { status: 500 });
    }
}
