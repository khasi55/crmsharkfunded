import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';

const router = Router();

// POST /api/coupons/validate - Validate coupon code
router.post('/validate', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const { code, amount, account_type_id } = req.body;

        if (!code || !amount) {
            res.status(400).json({ error: 'Code and amount are required' });
            return;
        }

        // Fetch coupon
        const { data: coupon, error: couponError } = await supabase
            .from('discount_coupons')
            .select('*')
            .eq('code', code.toUpperCase())
            .eq('is_active', true)
            .single();

        if (couponError || !coupon) {
            res.json({
                valid: false,
                error: 'Invalid or expired coupon code'
            });
            return;
        }

        // Check validity period
        const now = new Date();
        const validFrom = new Date(coupon.valid_from);
        const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

        if (now < validFrom) {
            res.json({
                valid: false,
                error: 'Coupon is not yet valid'
            });
            return;
        }

        if (validUntil && now > validUntil) {
            res.json({
                valid: false,
                error: 'Coupon has expired'
            });
            return;
        }

        // Check usage limit
        // TODO: distinct usage count table needed for accurate tracking
        // For now, we assume max_uses is checked against a separate query if needed
        // Since we don't have 'used_count' column on 'discount_coupons' in new schema, we skip this check or need to add it.
        // if (coupon.max_uses && coupon.used_count >= coupon.max_uses) { ... }

        // Check minimum purchase amount
        if (amount < (coupon.min_purchase_amount || 0)) {
            res.json({
                valid: false,
                error: `Minimum purchase amount is $${coupon.min_purchase_amount}`
            });
            return;
        }

        // Check if applicable to selected account type
        const applicableTo = coupon.account_types || [];
        // If empty or null, assume valid for all? Or check if explicit 'all'.
        // Let's assume if null, it's valid for all.
        if (applicableTo && applicableTo.length > 0 && !applicableTo.includes('all') && account_type_id && !applicableTo.includes(account_type_id)) {
            res.json({
                valid: false,
                error: 'Coupon not applicable to selected account type'
            });
            return;
        }

        // Check if user already used this coupon
        // We need to make sure 'coupon_usages' table exists and uses 'discount_coupons' ID.
        // Assuming 'coupon_usage' table exists.
        /*
        const { data: previousUsage } = await supabase
            .from('coupon_usage')
            .select('id')
            .eq('coupon_id', coupon.id)
            .eq('user_id', user.id)
            .single();

        if (previousUsage) {
            res.json({
                valid: false,
                error: 'You have already used this coupon'
            });
            return;
        }
        */

        // Calculate discount
        let discountAmount = 0;
        if (coupon.discount_type === 'percentage') {
            discountAmount = (amount * coupon.discount_value) / 100;
            if (coupon.max_discount_amount) {
                discountAmount = Math.min(discountAmount, coupon.max_discount_amount);
            }
        } else {
            discountAmount = coupon.discount_value;
        }

        // Ensure discount doesn't exceed amount
        discountAmount = Math.min(discountAmount, amount);
        const finalAmount = amount - discountAmount;

        res.json({
            valid: true,
            coupon: {
                id: coupon.id,
                code: coupon.code,
                description: coupon.description
            },
            discount: {
                type: coupon.discount_type,
                value: coupon.discount_value,
                amount: discountAmount
            },
            finalAmount: finalAmount
        });

    } catch (error: any) {
        console.error('Coupon validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
