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

async function analyzeTradeHistory() {
    console.log('🔍 Analyzing Real Trade History for Risk Violations...\n');

    // 1. Get recent challenges with trades
    const { data: challenges, error: challengeError } = await supabase
        .from('challenges')
        .select('id, login, user_id, challenge_type, status')
        .not('login', 'is', null)
        .limit(10)
        .order('created_at', { ascending: false });

    if (challengeError || !challenges) {
        console.error('❌ Error fetching challenges:', challengeError);
        return;
    }

    console.log(`📊 Found ${challenges.length} recent accounts to analyze\n`);

    let totalViolations = 0;
    let violationsByType: Record<string, number> = {};

    // 2. Analyze each challenge
    for (const challenge of challenges) {
        console.log(`\n🔎 Analyzing Account ${challenge.login} (${challenge.challenge_type})`);
        console.log(`   Status: ${challenge.status}`);

        // Fetch all trades for this challenge
        const { data: trades, error: tradesError } = await supabase
            .from('trades')
            .select('*')
            .eq('challenge_id', challenge.id)
            .order('open_time', { ascending: true });

        if (tradesError || !trades || trades.length === 0) {
            console.log('   ℹ️  No trades found');
            continue;
        }

        console.log(`   📈 Found ${trades.length} trades`);

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

        // Analyze each trade
        let accountViolations = 0;
        for (let i = 0; i < trades.length; i++) {
            const trade = trades[i];

            // Get trades up to this point for context
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

            if (violations.length > 0) {
                accountViolations += violations.length;
                totalViolations += violations.length;

                console.log(`   ⚠️  Trade #${trade.ticket_number}:`);
                for (const v of violations) {
                    console.log(`      🚨 ${v.violation_type.toUpperCase()}: ${v.description}`);
                    violationsByType[v.violation_type] = (violationsByType[v.violation_type] || 0) + 1;
                }
            }
        }

        if (accountViolations === 0) {
            console.log('   ✅ No violations detected');
        } else {
            console.log(`   🔴 Total violations: ${accountViolations}`);
        }
    }

    // 3. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 ANALYSIS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Accounts Analyzed: ${challenges.length}`);
    console.log(`Total Violations Found: ${totalViolations}`);

    if (totalViolations > 0) {
        console.log('\n📋 Violations by Type:');
        Object.entries(violationsByType).forEach(([type, count]) => {
            console.log(`   • ${type.toUpperCase()}: ${count}`);
        });
    } else {
        console.log('\n✅ No violations detected in recent trades');
    }

    // 4. Check for existing flagged violations in database
    console.log('\n📌 Checking Database Risk Flags...');
    const { data: existingFlags, error: flagsError } = await supabase
        .from('advanced_risk_flags')
        .select('flag_type, severity, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (!flagsError && existingFlags && existingFlags.length > 0) {
        console.log(`Found ${existingFlags.length} recent flags in database:`);
        console.table(existingFlags);
    } else {
        console.log('No risk flags found in database');
    }

    console.log('\n✨ Analysis Complete!');
}

analyzeTradeHistory().catch(console.error);
