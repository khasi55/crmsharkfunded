import express from 'express';
import { supabase } from '../lib/supabase'; // Adjust path if needed
import { authenticate } from '../middleware/auth'; // Ensure admin auth

const router = express.Router();

// --- RISK GROUPS ---
router.get('/groups', authenticate, async (req, res) => {
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

router.post('/groups', authenticate, async (req, res) => {
    const { id, group_name, max_drawdown_percent, daily_drawdown_percent } = req.body;
    try {
        const { data, error } = await supabase
            .from('mt5_risk_groups')
            .upsert({
                id, // If ID provided, update. If not, insert (but need logic, usually Upsert works if PK known)
                group_name,
                max_drawdown_percent,
                daily_drawdown_percent,
                updated_at: new Date()
            })
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- SERVER CONFIG ---
router.get('/server-config', authenticate, async (req, res) => {
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

router.post('/server-config', authenticate, async (req, res) => {
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
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- LOGS ---
router.get('/logs', authenticate, async (req, res) => {
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

export default router;
