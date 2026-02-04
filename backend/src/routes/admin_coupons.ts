import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET / - List all coupons
router.get('/', async (req: Request, res: Response) => {
    try {
        // Build query
        let query = supabase
            .from('discount_coupons')
            .select('*')
            .order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching coupons:', error);
            res.status(500).json({ error: 'Failed to fetch coupons' });
            return;
        }

        res.json({ coupons: data });
    } catch (error) {
        console.error('Error in GET /coupons:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST / - Create a new coupon
router.post('/', async (req: Request, res: Response) => {
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

        if (!code || !discount_type || !discount_value) {
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

        res.status(201).json({ coupon: data });
    } catch (error) {
        console.error('Error in POST /coupons:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /:id - Update a coupon
router.put('/:id', async (req: Request, res: Response) => {
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

        res.json({ coupon: data });
    } catch (error) {
        console.error('Error in PUT /coupons/:id:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /:id - Delete a coupon (or deactivate)
router.delete('/:id', async (req: Request, res: Response) => {
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

        res.json({ success: true });
    } catch (error) {
        console.error('Error in DELETE /coupons/:id:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
