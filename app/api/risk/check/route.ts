import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { RiskEngine, Trade } from '@/lib/risk-engine';

/**
 * POST /api/risk/check
 * 
 * Real-time risk check for a new trade
 * 
 * Request body:
 * {
 *   challengeId: string;
 *   trade: Trade;
 * }
 */
export async function POST(request: Request) {
    try {
        const supabase = supabaseAdmin;
        const { challengeId, trade } = await request.json();

        if (!challengeId || !trade) {
            return NextResponse.json(
                { error: 'Missing required fields: challengeId and trade' },
                { status: 400 }
            );
        }

        // Initialize risk engine
        const riskEngine = new RiskEngine(supabase);

        // Run risk check
        const result = await riskEngine.checkTrade(trade);

        // Log violations to database
        if (result.violations.length > 0) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await Promise.all(
                    result.violations.map(violation =>
                        riskEngine.logViolation(challengeId, user.id, violation)
                    )
                );
            }
        }

        // If breached, update challenge status
        if (result.is_breached) {
            await supabase
                .from('challenges_evaluation')
                .update({
                    status: 'breached',
                    is_breached: true,
                    is_active: false
                })
                .eq('id', challengeId);
        }

        return NextResponse.json({
            success: true,
            ...result
        });

    } catch (error: any) {
        console.error('Risk check API error:', error);
        return NextResponse.json(
            { error: 'Risk check failed', message: error.message },
            { status: 500 }
        );
    }
}
