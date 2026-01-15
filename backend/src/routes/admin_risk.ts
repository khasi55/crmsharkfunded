import express from 'express';
import { supabase } from '../lib/supabase'; // Adjust path if needed
import { authenticate } from '../middleware/auth'; // Ensure admin auth
import { RulesService } from '../services/rules-service'; // Import RulesService
import { EmailService } from '../services/email-service'; // Import EmailService

const router = express.Router();

// --- RISK GROUPS ---
router.get('/groups', authenticate, async (req: any, res: any) => {
    try {
        const { data, error } = await supabase
            .from('mt5_risk_groups')
            .select('*')
            .order('group_name');

        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/groups', authenticate, async (req: any, res: any) => {
    const { id, group_name, max_drawdown_percent, daily_drawdown_percent, profit_target_percent } = req.body;
    console.log("📝 [Admin Risk] Saving Group:", { id, group_name, profit_target_percent });
    try {
        const { data, error } = await supabase
            .from('mt5_risk_groups')
            .upsert({
                id,
                group_name,
                max_drawdown_percent,
                daily_drawdown_percent,
                profit_target_percent,
                updated_at: new Date()
            })
            .select()
            .single();

        if (error) {
            console.error("❌ [Admin Risk] Save Error:", error.message);
            throw error;
        }
        console.log("✅ [Admin Risk] Saved Group:", data);
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- SERVER CONFIG ---
router.get('/server-config', authenticate, async (req: any, res: any) => {
    try {
        const { data, error } = await supabase
            .from('mt5_server_config')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // 116 is no rows

        // MASK PASSWORD
        if (data) {
            data.manager_password = "********";
        }

        res.json(data || {});
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/server-config', authenticate, async (req: any, res: any) => {
    const { server_ip, manager_login, manager_password, api_port, callback_url, monitored_groups } = req.body;
    try {
        // Fetch existing logic to handle password update
        // If password is "********", keep old one.
        let passToSave = manager_password;

        // Fetch latest config to get ID and old password
        let { data: existing, error: fetchError } = await supabase
            .from('mt5_server_config')
            .select('id, manager_password')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        // Handle "No Rows" cleanly
        if (fetchError && fetchError.code === 'PGRST116') {
            existing = null;
        } else if (fetchError) {
            throw fetchError;
        }

        console.log("Saving Server Config. Existing ID:", existing?.id);

        if (manager_password === "********") {
            if (existing) passToSave = existing.manager_password;
        }

        // We assume single row config, so we can try to fetch ID or just upsert hardcoded? 
        // Better to fetch ID first or use a known strategy. 
        // Since we created table with UUID default, let's fetch the first row to get ID if it exists.

        const payload: any = {
            server_ip,
            manager_login,
            manager_password: passToSave,
            api_port,
            callback_url,
            monitored_groups,
            updated_at: new Date()
        };

        if (existing) {
            payload.id = existing.id;
        }

        // Use UPSERT
        const { data, error } = await supabase
            .from('mt5_server_config')
            .upsert(payload)
            .select()
            .single();

        if (error) throw error;

        // --- TRIGGER BRIDGE RELOAD ---
        const BRIDGE_URL = process.env.BRIDGE_URL || 'http://localhost:5001';
        try {
            console.log("Triggering Bridge Reload...", BRIDGE_URL);
            // We use a short timeout because we don't want to block the UI if bridge is restarting
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            await fetch(`${BRIDGE_URL}/reload-config`, {
                method: 'POST',
                signal: controller.signal
            }).then(r => r.json()).then(d => console.log("Reload Response:", d));

            clearTimeout(timeoutId);
        } catch (bridgeError) {
            console.error("Failed to trigger bridge reload (might be offline):", bridgeError);
            // Non-fatal, user saved config to DB at least.
        }

        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- LOGS ---
router.get('/logs', authenticate, async (req: any, res: any) => {
    try {
        const { data, error } = await supabase
            .from('system_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- ACCOUNT ACTIONS ---
router.post('/upgrade-account', authenticate, async (req: any, res: any) => {
    const { accountId } = req.body;
    try {
        console.log(`🚀 Admin requesting upgrade for account ${accountId}`);

        // 1. Fetch Source Account
        const { data: sourceAccount, error: fetchError } = await supabase
            .from('challenges')
            .select('*')
            .eq('id', accountId)
            .single();

        if (fetchError || !sourceAccount) {
            return res.status(404).json({ error: 'Account not found' });
        }

        if (sourceAccount.status !== 'passed') {
            return res.status(400).json({ error: 'Account must be in PASSED status to upgrade.' });
        }

        // 2. Determine Next Phase
        // Simple logic: Phase 1 -> Phase 2. Phase 2 -> Funded? (Future scope)
        // For now, assume Phase 1 -> Phase 2.
        const currentType = (sourceAccount.challenge_type || '').toLowerCase();
        let nextType = 'Phase 2';
        let targetGroup = sourceAccount.group.replace('Phase 1', 'Phase 2').replace('Step 1', 'Step 2');

        if (currentType.includes('phase 2') || currentType.includes('step 2')) {
            return res.status(400).json({ error: 'Phase 2 accounts cannot be auto-upgraded yet (Requires Manual Funded Creation).' });
        }

        // 3. Create New Account on Bridge
        const BRIDGE_URL = process.env.BRIDGE_URL || 'http://localhost:5001';

        // Use same user details
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', sourceAccount.user_id).single();

        const payload = {
            login: Number(sourceAccount.login), // We usually want a NEW login for new account. 
            // Wait, existing logic usually implies creating a NEW MT5 account.
            // Let's generate a new request to Bridge to create account.
            firstName: profile?.full_name?.split(' ')[0] || 'Trader',
            lastName: profile?.full_name?.split(' ').slice(1).join(' ') || 'User',
            email: profile?.email || 'no-email@sharkfunded.com',
            group: targetGroup,
            leverage: 100, // Default
            deposit: Number(sourceAccount.initial_balance)
        };

        // Call Bridge to Create Account
        const createRes = await fetch(`${BRIDGE_URL}/create-account`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!createRes.ok) {
            const errText = await createRes.text();
            throw new Error(`Bridge Account Creation Failed: ${errText}`);
        }

        const newAccountData = (await createRes.json()) as any;

        // 4. Insert New Challenge Record
        const { data: newChallenge, error: insertError } = await supabase
            .from('challenges')
            .insert({
                user_id: sourceAccount.user_id,
                login: newAccountData.login,
                master_password: newAccountData.password,
                investor_password: newAccountData.investorPassword,
                server: newAccountData.server || 'MT5-Real',
                challenge_type: nextType,
                initial_balance: payload.deposit,
                current_balance: payload.deposit,
                current_equity: payload.deposit,
                start_of_day_equity: payload.deposit,
                status: 'active',
                group: targetGroup,
                plan_type: sourceAccount.metadata?.plan_type || 'Standard',
                metadata: {
                    ...sourceAccount.metadata,
                    origin_account_id: sourceAccount.id,
                    upgraded_from: sourceAccount.login
                }
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // 5. Move Old Account to Passed History & Delete from Active

        // Calculate Profit Target Snapshot using RulesService
        const { profitTarget } = await RulesService.calculateObjectives(sourceAccount.id);

        // A. Insert into passed_challenges
        const { error: archiveError } = await supabase
            .from('passed_challenges')
            .insert({
                // original_challenge_id: sourceAccount.id, // Optional, might irrelevant if we delete
                user_id: sourceAccount.user_id,
                login: sourceAccount.login,
                challenge_type: sourceAccount.challenge_type,
                plan_type: sourceAccount.metadata?.plan_type || 'Standard',
                server: sourceAccount.server,
                initial_balance: sourceAccount.initial_balance,
                final_balance: sourceAccount.current_balance,
                final_equity: sourceAccount.current_equity,
                profit_target: profitTarget, // Save snapshot
                passed_at: new Date(),
                metadata: {
                    ...sourceAccount.metadata,
                    upgraded_to: newChallenge.id,
                    upgraded_at: new Date()
                }
            });

        if (archiveError) {
            console.error("Failed to archive passed account:", archiveError);
            // Non-fatal? We still created the new account.
            // But we shouldn't delete the old one if archive failed.
        } else {
            // B. Delete from Active Challenges
            const { error: deleteError } = await supabase
                .from('challenges')
                .delete()
                .eq('id', sourceAccount.id);

            if (deleteError) {
                console.error("Failed to delete old account after archive:", deleteError);
            } else {
                console.log(`✅ Archived and Deleted old account ${sourceAccount.login}`);
            }
        }

        // 6. Send Credentials Email
        // Fetch user email if not in profile, fallback is already handled in payload generation but let's be sure
        const userEmail = payload.email;
        const userName = `${payload.firstName} ${payload.lastName}`;

        console.log(`📧 Sending credentials email to ${userEmail}...`);

        // Don't await email to prevent blocking response? Or await to ensure it sent?
        // Let's await but catch error so we don't fail the request if email fails
        try {
            await EmailService.sendAccountCredentials(
                userEmail,
                userName,
                String(newAccountData.login),
                newAccountData.password,
                newAccountData.server || 'ALFX Limited',
                newAccountData.investorPassword
            );
        } catch (emailErr) {
            console.error("Failed to send credentials email:", emailErr);
        }

        res.json({ success: true, newAccount: newChallenge });

    } catch (e: any) {
        console.error("Upgrade Error:", e);
        res.status(500).json({ error: e.message });
    }
});

export default router;
