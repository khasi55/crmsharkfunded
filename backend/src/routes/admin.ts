import { Router, Response, Request } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { createMT5Account, disableMT5Account } from '../lib/mt5-bridge';
import { EmailService } from '../services/email-service';

const router = Router();

router.post('/upgrade-account', async (req: Request, res: Response) => {
    try {
        const { accountId } = req.body;

        if (!accountId) {
            return res.status(400).json({ error: 'Account ID is required' });
        }

        // Fetch the current account
        const { data: account, error: fetchError } = await supabase
            .from('challenges')
            .select('*')
            .eq('id', accountId)
            .single();

        if (fetchError || !account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        if (account.status !== 'passed' && account.status !== 'active') {
            return res.status(400).json({ error: 'Account must be in passed or active status to upgrade' });
        }

        // Determine upgrade path
        const currentType = (account.challenge_type || '').toLowerCase();
        const currentGroup = (account.group || '').toUpperCase();
        let nextType = '';
        let mt5Group = '';
        let needsNewMT5 = false;

        // Group detection logic (PRIORITIZE LITE STRING)
        const isLite = currentType.includes('lite') || (currentGroup.includes('\\S\\') && !currentGroup.includes('\\SF\\'));
        const isPrime = !isLite && (currentType.includes('prime') || currentGroup.includes('\\SF\\') || currentGroup.includes('PRO'));

        const isPhase1 = currentType.includes('phase 1') || currentType.includes('phase_1') ||
            currentType.includes('step 1') || currentType.includes('step_1') ||
            currentType.includes('evaluation') ||
            (currentType.includes('2 step') && !currentType.includes('phase 2') && !currentType.includes('phase_2')) ||
            (currentType.includes('2_step') && !currentType.includes('phase 2') && !currentType.includes('phase_2'));

        const isPhase2 = currentType.includes('phase 2') || currentType.includes('phase_2') ||
            currentType.includes('step 2') || currentType.includes('step_2');

        const isOneStep = currentType.includes('1-step') || currentType.includes('1_step') ||
            currentType.includes('1 step') || currentType.includes('instant');

        const DEBUG = process.env.DEBUG === 'true';
        // if (DEBUG) {
        //     console.log(`[Upgrade] ID: ${accountId}, Group: ${currentGroup}, Type: ${currentType}`);
        //     console.log(`[Upgrade] Detection: isPrime=${isPrime}, isLite=${isLite}, isPhase1=${isPhase1}, isPhase2=${isPhase2}, isOneStep=${isOneStep}`);
        // }

        // Define exact upgrade transitions
        if (isLite) {
            if (isOneStep || isPhase2) {
                nextType = 'lite_funded';
                mt5Group = 'demo\\S\\0-SF';
                needsNewMT5 = true;
            } else if (isPhase1) {
                nextType = 'lite_2_step_phase_2';
                mt5Group = 'demo\\S\\2-SF';
                needsNewMT5 = true;
            }
        } else if (isPrime) {
            if (isOneStep || isPhase2) {
                nextType = 'prime_funded';
                mt5Group = 'demo\\SF\\0-Pro';
                needsNewMT5 = true;
            } else if (isPhase1) {
                nextType = 'prime_2_step_phase_2';
                mt5Group = 'demo\\SF\\2-Pro';
                needsNewMT5 = true;
            }
        }

        if (!nextType) {
            return res.status(400).json({
                error: `Cannot determine upgrade path for: ${account.challenge_type} (Group: ${currentGroup})`
            });
        }

        if (DEBUG) console.log(`Upgrading ${account.challenge_type} → ${nextType} | ${needsNewMT5 ? 'NEW MT5' : 'KEEP MT5'} (${mt5Group})`);

        // Get user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', account.user_id)
            .single();

        let mt5Login = account.login;
        let mt5Password = account.master_password;
        let mt5InvestorPassword = account.investor_password;
        let mt5Server = account.server;

        // Create new MT5 account if needed
        if (needsNewMT5) {
            const mt5Data = await createMT5Account({
                name: profile?.full_name || 'Trader',
                email: profile?.email || 'noemail@sharkfunded.com',
                group: mt5Group,
                leverage: account.leverage || 100,
                balance: account.initial_balance,
            });

            mt5Login = mt5Data.login;
            mt5Password = mt5Data.password;
            mt5InvestorPassword = mt5Data.investor_password || '';
            mt5Server = mt5Data.server || 'ALFX Limited';
        }

        let newChallenge;

        if (needsNewMT5) {
            // Create NEW challenge record with new MT5 account
            const { data, error: createError } = await supabase
                .from('challenges')
                .insert({
                    user_id: account.user_id,
                    challenge_type: nextType,
                    initial_balance: account.initial_balance,
                    current_balance: account.initial_balance,
                    current_equity: account.initial_balance,
                    start_of_day_equity: account.initial_balance,
                    login: mt5Login,
                    master_password: mt5Password,
                    investor_password: mt5InvestorPassword,
                    server: mt5Server,
                    group: mt5Group,
                    leverage: account.leverage || 100,
                    status: 'active',
                    metadata: {
                        ...(account.metadata || {}),
                        upgraded_from: account.id,
                        upgraded_at: new Date().toISOString()
                    }
                })
                .select()
                .single();

            if (createError) {
                console.error('Error creating new challenge:', createError);
                return res.status(500).json({ error: 'Failed to create upgraded account', details: createError.message });
            }

            newChallenge = data;

            // Link to competition if applicable
            const competitionId = account.metadata?.competition_id;
            if (competitionId) {
                await supabase
                    .from('competition_participants')
                    .upsert({
                        competition_id: competitionId,
                        user_id: account.user_id,
                        challenge_id: newChallenge.id,
                        status: 'active'
                    }, { onConflict: 'competition_id, user_id' });
                if (DEBUG) console.log(`✅ Competition link updated to new account ${newChallenge.login}`);
            }

            // Mark old account as disabled (with link to new account)
            const { error: updateError } = await supabase
                .from('challenges')
                .update({
                    status: 'disabled', // Terminal state for old phase
                    upgraded_to: newChallenge.id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', accountId);

            if (updateError) {
                console.error(`❌ Failed to mark old account ${account.login} as disabled:`, updateError);
                // We don't fail the whole request since the new account WAS created, 
                // but we log it for admin review.
            } else {
                if (DEBUG) console.log(`✅ Old account ${account.login} marked as DISABLED in database.`);
            }

            // Disable old MT5 account via bridge
            if (account.login) {
                if (DEBUG) console.log(`🔌 Requesting MT5 bridge to disable old account ${account.login}...`);
                disableMT5Account(account.login).catch(err => {
                    console.error(`❌ Bridge failed to disable account ${account.login}:`, err.message);
                });
            }
        } else {
            // UPDATE existing challenge record (same MT5 account)
            const { data, error: updateError } = await supabase
                .from('challenges')
                .update({
                    challenge_type: nextType,
                    group: mt5Group,
                    status: 'active',
                    updated_at: new Date().toISOString(),
                    metadata: {
                        ...(account.metadata || {}),
                        last_upgrade_at: new Date().toISOString()
                    }
                })
                .eq('id', accountId)
                .select()
                .single();

            if (updateError) {
                console.error('Error updating challenge:', updateError);
                return res.status(500).json({ error: 'Failed to upgrade account', details: updateError.message });
            }

            newChallenge = data;
        }

        // Send credentials email if a new account was created
        if (needsNewMT5 && profile?.email) {
            EmailService.sendAccountCredentials(
                profile.email,
                profile.full_name || 'Trader',
                String(mt5Login),
                mt5Password,
                mt5Server || 'ALFX Limited',
                mt5InvestorPassword
            ).catch(err => console.error("Async Email Error in Upgrade:", err));
        }

        if (DEBUG) console.log(`Account ${account.login} upgraded → ${nextType} (Login: ${mt5Login})`);

        res.json({
            success: true,
            message: 'Account upgraded successfully',
            newAccountId: newChallenge.id,
            newLogin: mt5Login,
            nextPhase: nextType,
            newMT5Created: needsNewMT5
        });

    } catch (error: any) {
        console.error('Upgrade error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

export default router;
