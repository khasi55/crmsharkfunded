import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';

const router = Router();

// POST /api/coupons/validate - Validate coupon code
router.post('/validate', async (req: AuthRequest, res: Response) => {
    try {
        const { code, amount, account_type_id } = req.body;

        if (!code || !amount) {
            res.status(400).json({ error: 'Code and amount are required' });
            return;
        }

        // Optional user ID for validation (guest vs logged in)
        const userId = req.user?.id || '00000000-0000-0000-0000-000000000000'; // Anonymous user ID or handle in RPC

        console.log(`[Coupons] Validating code: ${code} for user: ${userId}, amount: ${amount}`);

        // Use RPC for validation (handles usage tracking, correct table, and case-insensitivity)
        const { data: result, error: rpcError } = await supabase.rpc('validate_coupon', {
            p_code: code.trim(),
            p_user_id: userId,
            p_amount: amount,
            p_account_type: account_type_id || 'all'
        });

        if (rpcError) {
            console.error('[Coupons] RPC Error:', rpcError);
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
        const debugFile = require('path').resolve(__dirname, '../../coupon_debug.log');
        require('fs').appendFileSync(debugFile, `\n--- [${new Date().toISOString()}] ---\n`);
        require('fs').appendFileSync(debugFile, `RPC Result: ${JSON.stringify(validation, null, 2)}\n`);

        if (!validation || !validation.is_valid) {
            require('fs').appendFileSync(debugFile, `Invalid: ${validation?.message || 'Unknown'}\n`);
            res.json({
                valid: false,
                error: validation?.message || 'Invalid or expired coupon code'
            });
            return;
        }

        // Calculate final amounts for response
        const discountAmount = validation.discount_amount;
        const finalAmount = amount - discountAmount;

        // Ensure we have the discount value for display (fallback if RPC is old and returns limited columns)
        let discountValue = validation.discount_value;
        let couponId = validation.coupon_id;

        if (discountValue === undefined || discountValue === null || !couponId) {
            // Fetch directly from table by code if RPC output is incomplete
            const { data: couponData } = await supabase
                .from('discount_coupons')
                .select('id, discount_value')
                .ilike('code', code.trim())
                .eq('is_active', true)
                .limit(1)
                .single();

            if (couponData) {
                discountValue = couponData.discount_value;
                couponId = couponData.id;
            }
        }

        res.json({
            valid: true,
            coupon: {
                id: couponId,
                code: code,
            },
            discount: {
                type: validation.discount_type || 'percentage',
                value: discountValue,
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
