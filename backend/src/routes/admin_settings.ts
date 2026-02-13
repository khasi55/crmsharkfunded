import express from 'express';
import { supabase } from '../lib/supabase';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { AuditLogger } from '../lib/audit-logger';

const router = express.Router();

// --- MERCHANT SETTINGS ---

// GET /api/admin/settings/merchant
router.get('/merchant', authenticate, requireRole(['super_admin', 'admin']), async (req: AuthRequest, res) => {
    try {
        const { data, error } = await supabase
            .from('merchant_config')
            .select('*')
            .order('gateway_name');

        if (error) {
            // If table doesn't exist yet, return empty or mock?
            if (error.code === '42P01') { // undefined_table
                return res.json([]);
            }
            throw error;
        }

        // Mask Secrets
        const masked = data.map(gw => ({
            ...gw,
            api_key: gw.api_key ? (gw.api_key.substring(0, 4) + '****') : '',
            api_secret: gw.api_secret ? '********' : '',
            webhook_secret: gw.webhook_secret ? '********' : ''
        }));

        res.json(masked);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/admin/settings/merchant
// Update a specific gateway
router.post('/merchant', authenticate, requireRole(['super_admin', 'admin']), async (req: AuthRequest, res) => {
    const { id, gateway_name, is_active, api_key, api_secret, webhook_secret, environment } = req.body;

    try {
        // Fetch existing to handle secrets
        let existing: any = null;
        if (id) {
            const { data } = await supabase.from('merchant_config').select('*').eq('id', id).single();
            existing = data;
        } else {
            const { data } = await supabase.from('merchant_config').select('*').eq('gateway_name', gateway_name).single();
            existing = data;
        }

        const payload: any = {
            gateway_name,
            is_active,
            environment,
            updated_at: new Date()
        };

        // Handle Secrets: Only update if provided and not masked
        if (api_key && !api_key.includes('****')) payload.api_key = api_key;
        if (api_secret && !api_secret.includes('****')) payload.api_secret = api_secret;
        if (webhook_secret && !webhook_secret.includes('****')) payload.webhook_secret = webhook_secret;

        const query = supabase.from('merchant_config');
        let result;

        if (existing) {
            result = await query.update(payload).eq('id', existing.id).select().single();
        } else {
            // Insert new
            result = await query.insert(payload).select().single();
        }

        if (result.error) throw result.error;

        AuditLogger.info(req.user?.email || 'admin', `Updated Merchant Config: ${gateway_name}`, { gateway_name, category: 'Settings' });
        res.json(result.data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- PRICING SETTINGS ---

// GET /api/admin/settings/pricing
router.get('/pricing', authenticate, requireRole(['super_admin', 'admin']), async (req: AuthRequest, res) => {
    try {
        const { data, error } = await supabase
            .from('pricing_configurations')
            .select('config')
            .eq('key', 'global_pricing')
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // No rows found
                return res.json({});
            }
            // If table doesn't exist (42P01), return empty
            if (error.code === '42P01') {
                return res.json({});
            }
            throw error;
        }

        res.json(data?.config || {});
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/admin/settings/pricing
router.post('/pricing', authenticate, requireRole(['super_admin', 'admin']), async (req: AuthRequest, res) => {
    try {
        const config = req.body;

        const { data, error } = await supabase
            .from('pricing_configurations')
            .upsert({
                key: 'global_pricing',
                config: config,
                updated_at: new Date()
            }, { onConflict: 'key' })
            .select()
            .single();

        if (error) throw error;

        AuditLogger.info(req.user?.email || 'admin', `Updated Global Pricing Config`, { category: 'Settings' });
        res.json(data.config);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
