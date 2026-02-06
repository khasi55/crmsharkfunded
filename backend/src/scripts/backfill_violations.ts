import { createClient } from '@supabase/supabase-js';
import { AdvancedRiskEngine } from '../engine/risk-engine-advanced';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const riskEngine = new AdvancedRiskEngine(supabase);

async function backfillViolations() {
    console.log('🔄 Backfilling Risk Violations to Database...\n');

    // Get recent challenges with trades
    const { data: challenges, error: challengeError } = await supabase
        .from('challenges')
        .select('id, login, user_id, challenge_type, status')
        .not('login', 'is', null)
        .limit(50) // Increase to analyze more accounts
        .order('created_at', { ascending: false });

    if (challengeError || !challenges) {
        console.error('❌ Error fetching challenges:', challengeError);
        return;
    }

    console.log(`📊 Analyzing ${challenges.length} accounts for violations...\n`);

    let totalViolationsLogged = 0;

    for (const challenge of challenges) {
        // Fetch all trades for this challenge
        const { data: trades, error: tradesError } = await supabase
            .from('trades')
            .select('*')
            .eq('challenge_id', challenge.id)
            .order('open_time', { ascending: true });

        if (tradesError || !trades || trades.length === 0) {
            continue;
        }

        console.log(`Analyzing Account ${challenge.login} (${trades.length} trades)...`);

        // Get risk rules config
        const { data: rulesConfig } = await supabase
            .from('risk_rules_config')
            .select('*')
            .limit(1)
            .single();

        const rules = {
            allow_weekend_trading: rulesConfig?.allow_weekend_trading ?? true,
            allow_news_trading: rulesConfig?.allow_news_trading ?? true,
            allow_ea_trading: rulesConfig?.allow_ea_trading ?? true,
            min_trade_duration_seconds: rulesConfig?.min_trade_duration_seconds ?? 60,
            max_single_win_percent: rulesConfig?.max_single_win_percent ?? 50
        };

        let accountViolations = 0;

        // Analyze each trade
        for (let i = 0; i < trades.length; i++) {
            const trade = trades[i];

            const previousTrades = trades.slice(0, i);
            const todayStart = new Date(trade.open_time);
            todayStart.setHours(0, 0, 0, 0);
            const todaysTrades = previousTrades.filter(t =>
                new Date(t.open_time) >= todayStart
            );
            const openTrades = previousTrades.filter(t => !t.close_time);

            // Run risk checks
            const violations = await riskEngine.checkBehavioralRisk(
                trade,
                rules,
                todaysTrades,
                openTrades
            );

            // Log violations to database
            if (violations.length > 0) {
                for (const violation of violations) {
                    // Check if this violation already exists
                    const { data: existing } = await supabase
                        .from('advanced_risk_flags')
                        .select('id')
                        .eq('challenge_id', challenge.id)
                        .eq('trade_ticket', trade.ticket_number)
                        .eq('flag_type', violation.violation_type)
                        .single();

                    if (!existing) {
                        // Insert new violation
                        const { error: insertError } = await supabase
                            .from('advanced_risk_flags')
                            .insert({
                                challenge_id: challenge.id,
                                user_id: challenge.user_id,
                                flag_type: violation.violation_type,
                                severity: violation.severity,
                                description: violation.description,
                                trade_ticket: violation.trade_ticket, // Keep for description reference
                                trade_id: trade.id, // Use trade ID for lookup
                                symbol: trade.symbol,
                                analysis_data: {},
                                is_reviewed: false,
                                created_at: trade.close_time || trade.open_time
                            });

                        if (insertError) {
                            console.error(`  ❌ Failed to insert violation:`, insertError.message);
                        } else {
                            accountViolations++;
                            totalViolationsLogged++;
                        }
                    }
                }
            }
        }

        if (accountViolations > 0) {
            console.log(`  ✅ Logged ${accountViolations} violations for account ${challenge.login}`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✨ Backfill Complete!`);
    console.log(`Total Violations Logged: ${totalViolationsLogged}`);
    console.log('='.repeat(60));
}

backfillViolations().catch(console.error);
