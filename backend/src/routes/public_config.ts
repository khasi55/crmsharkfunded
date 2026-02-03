import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/config/pricing - Public Pricing Config
router.get('/pricing', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('pricing_configurations')
            .select('config')
            .eq('key', 'global_pricing')
            .single();

        if (error) {
            if (error.code === 'PGRST116' || error.code === '42P01') {
                return res.json({});
            }
            throw error;
        }

        res.json(data?.config || {});
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
