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

        // Use RPC for validation (handles usage tracking, correct table, and case-insensitivity)
        const { data: result, error: rpcError } = await supabase.rpc('validate_coupon', {
            p_code: code.trim(),
            p_user_id: user.id,
            p_amount: amount,
            p_account_type: account_type_id || 'all'
        });

        if (rpcError) {
            console.error('RPC Error:', rpcError);
            // Fallback to manual check if RPC fails (unexpected)
            const { data: coupon, error: couponError } = await supabase
                .from('discount_coupons')
                .select('*')
                .ilike('code', code.trim())
                .eq('is_active', true)
                .single();

            if (couponError || !coupon) {
                res.json({ valid: false, error: 'Invalid or expired coupon code' });
                return;
            }
            // ... simple validation fallback ...
            res.json({ valid: false, error: 'Internal validation error' });
            return;
        }

        const validation = result && result[0];

        if (!validation || !validation.is_valid) {
            res.json({
                valid: false,
                error: validation?.message || 'Invalid or expired coupon code'
            });
            return;
        }

        // Calculate final amounts for response
        const discountAmount = validation.discount_amount;
        const finalAmount = amount - discountAmount;

        // Fetch coupon details for metadata (since RPC returns summary)
        const { data: fullCoupon } = await supabase
            .from('discount_coupons')
            .select('*')
            .ilike('code', code.trim())
            .single();

        res.json({
            valid: true,
            coupon: {
                id: fullCoupon?.id,
                code: fullCoupon?.code || code,
                description: fullCoupon?.description
            },
            discount: {
                type: fullCoupon?.discount_type,
                value: fullCoupon?.discount_value,
                amount: discountAmount
            },
            affiliate_id: validation.affiliate_id,
            commission_rate: validation.commission_rate,
            finalAmount: finalAmount
        });

    } catch (error: any) {
        console.error('Coupon validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
