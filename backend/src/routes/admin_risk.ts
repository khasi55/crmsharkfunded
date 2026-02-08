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
    // console.log("📝 [Admin Risk] Saving Group:", { id, group_name, profit_target_percent });
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
        // console.log("✅ [Admin Risk] Saved Group:", data);
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/groups/:id', authenticate, async (req: any, res: any) => {
    const { id } = req.params;
    // console.log("🗑️ [Admin Risk] Deleting Group:", id);
    try {
        const { error } = await supabase
            .from('mt5_risk_groups')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("❌ [Admin Risk] Delete Error:", error.message);
            throw error;
        }
        console.log("✅ [Admin Risk] Deleted Group:", id);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- CHALLENGE TYPE RULES ---
router.get('/challenge-type-rules', authenticate, async (req: any, res: any) => {
    try {
        const { data, error } = await supabase
            .from('challenge_type_rules')
            .select('*')
            .order('challenge_type');

        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/challenge-type-rules', authenticate, async (req: any, res: any) => {
    const { challenge_type, profit_target_percent, daily_drawdown_percent, max_drawdown_percent, description } = req.body;
    console.log("📝 [Admin Risk] Saving Challenge Type Rule:", { challenge_type, profit_target_percent });
    try {
        const { data, error } = await supabase
            .from('challenge_type_rules')
            .upsert({
                challenge_type,
                profit_target_percent,
                daily_drawdown_percent,
                max_drawdown_percent,
                description,
                updated_at: new Date()
            })
            .select()
            .single();

        if (error) {
            console.error("❌ [Admin Risk] Save Error:", error.message);
            throw error;
        }
        console.log("✅ [Admin Risk] Saved Challenge Type Rule:", data);
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

        // console.log("Saving Server Config. Existing ID:", existing?.id);

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

// End of Admin Risk Routes
export default router;
