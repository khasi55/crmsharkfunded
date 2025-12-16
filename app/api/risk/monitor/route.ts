import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/risk/monitor?challengeId=xxx
 * 
 * Get current risk status for a challenge
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const challengeId = searchParams.get('challengeId');

        if (!challengeId) {
            return NextResponse.json(
                { error: 'Missing challengeId parameter' },
                { status: 400 }
            );
        }

        const supabase = supabaseAdmin;

        // Get current daily stats
        const today = new Date().toISOString().split('T')[0];
        const { data: dailyStats, error: statsError } = await supabase
            .from('daily_stats')
            .select('*')
            .eq('challenge_id', challengeId)
            .eq('trading_date', today)
            .single();

        if (statsError) {
            return NextResponse.json(
                { error: 'Failed to fetch daily stats' },
                { status: 500 }
            );
        }

        // Get recent violations
        const { data: violations, error: violationsError } = await supabase
            .from('risk_violations')
            .select('*')
            .eq('challenge_id', challengeId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (violationsError) {
            return NextResponse.json(
                { error: 'Failed to fetch violations' },
                { status: 500 }
            );
        }

        // Determine status
        let status: 'healthy' | 'warning' | 'breached' = 'healthy';
        if (dailyStats.is_breached) {
            status = 'breached';
        } else if (violations.some(v => v.severity === 'warning' || v.severity === 'critical')) {
            status = 'warning';
        }

        return NextResponse.json({
            success: true,
            status,
            dailyStats,
            violations,
            metrics: {
                daily_pnl: dailyStats.daily_pnl,
                daily_loss_percent: Math.abs((dailyStats.daily_pnl / dailyStats.starting_balance) * 100),
                total_trades: dailyStats.total_trades,
                winning_trades: dailyStats.winning_trades,
                losing_trades: dailyStats.losing_trades,
                win_rate: dailyStats.total_trades > 0
                    ? (dailyStats.winning_trades / dailyStats.total_trades) * 100
                    : 0,
            }
        });

    } catch (error: any) {
        console.error('Risk monitor API error:', error);
        return NextResponse.json(
            { error: 'Risk monitoring failed', message: error.message },
            { status: 500 }
        );
    }
}
