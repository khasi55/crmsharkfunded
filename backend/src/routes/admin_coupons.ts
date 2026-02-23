import { Router, Response } from 'express';
import { supabase } from '../lib/supabase';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { AuditLogger } from '../lib/audit-logger';

const router = Router();

// GET / - List all coupons (admin only)
router.get('/', authenticate, requireRole(['super_admin', 'admin', 'sub_admin']), async (req: AuthRequest, res: Response) => {
    try {
        // Fetch coupons
        const { data: coupons, error: couponsError } = await supabase
            .from('discount_coupons')
            .select('*')
            .order('created_at', { ascending: false });

        if (couponsError) {
            console.error('Error fetching coupons:', couponsError);
            res.status(500).json({ error: 'Failed to fetch coupons' });
            return;
        }

        // Collect unique affiliate IDs
        const affiliateIds = [...new Set(
            coupons
                ?.filter(c => c.affiliate_id)
                .map(c => c.affiliate_id) || []
        )];

        // Fetch affiliate profiles
        let affiliateMap = new Map();
        if (affiliateIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, email')
                .in('id', affiliateIds);

            profiles?.forEach(p => {
                affiliateMap.set(p.id, { id: p.id, email: p.email });
            });
        }

        // Merge affiliate data into coupons
        const couponsWithAffiliates = coupons?.map(coupon => ({
            ...coupon,
            affiliate: coupon.affiliate_id ? affiliateMap.get(coupon.affiliate_id) || null : null
        }));

        res.json({ coupons: couponsWithAffiliates });
    } catch (error) {
        console.error('Error in GET /coupons:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST / - Create a new coupon
router.post('/', authenticate, requireRole(['super_admin', 'admin', 'sub_admin']), async (req: AuthRequest, res: Response) => {
    try {
        const {
            code,
            description,
            discount_type,
            discount_value,
            max_discount_amount,
            account_types,
            min_purchase_amount,
            max_uses,
            max_uses_per_user,
            valid_from,
            valid_until,
            is_active
        } = req.body;

        if (!code || !discount_type || discount_value === undefined || discount_value === null) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        const { data, error } = await supabase
            .from('discount_coupons')
            .insert({
                code: code.toUpperCase(),
                description,
                discount_type,
                discount_value,
                max_discount_amount,
                account_types,
                min_purchase_amount: min_purchase_amount || 0,
                max_uses,
                max_uses_per_user: max_uses_per_user || 1,
                valid_from: valid_from || new Date().toISOString(),
                valid_until,
                affiliate_id: req.body.affiliate_id || null,
                commission_rate: req.body.commission_rate || null,
                is_active: is_active ?? true
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique violation
                res.status(409).json({ error: 'Coupon code already exists' });
                return;
            }
            console.error('Error creating coupon:', error);
            res.status(500).json({ error: 'Failed to create coupon' });
            return;
        }

        AuditLogger.info(req.user?.email || 'admin', `Created coupon: ${code.toUpperCase()}`, { code, category: 'Marketing' });
        res.status(201).json({ coupon: data });
    } catch (error) {
        console.error('Error in POST /coupons:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /:id - Update a coupon
router.put('/:id', authenticate, requireRole(['super_admin', 'admin', 'sub_admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Prevent updating critical fields that shouldn't change naturally if used like 'code' unless necessary, but we'll allow it.
        // We generally shouldn't allow updating 'code' if it's already used, but for now we'll allow flexible editing.

        const { data, error } = await supabase
            .from('discount_coupons')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating coupon:', error);
            res.status(500).json({ error: 'Failed to update coupon' });
            return;
        }

        AuditLogger.info(req.user?.email || 'admin', `Updated coupon ID: ${id}`, { id, category: 'Marketing' });
        res.json({ coupon: data });
    } catch (error) {
        console.error('Error in PUT /coupons/:id:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /:id - Delete a coupon (or deactivate)
router.delete('/:id', authenticate, requireRole(['super_admin', 'admin', 'sub_admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('discount_coupons')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting coupon:', error);
            res.status(500).json({ error: 'Failed to delete coupon' });
            return;
        }

        AuditLogger.warn(req.user?.email || 'admin', `Deleted coupon ID: ${id}`, { id, category: 'Marketing' });
        res.json({ success: true });
    } catch (error) {
        console.error('Error in DELETE /coupons/:id:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
