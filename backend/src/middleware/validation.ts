import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validateRequest = (schema: z.ZodSchema<any>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            return next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: error.issues.map((e: any) => ({
                        path: e.path.join('.'),
                        message: e.message
                    }))
                });
            }
            return res.status(500).json({ error: 'Internal server error during validation' });
        }
    };
};

// --- Common Schemas ---

export const profileUpdateSchema = z.object({
    body: z.object({
        full_name: z.string().min(2).max(100).optional(),
        phone: z.string().min(5).max(20).optional(),
        country: z.string().min(2).max(50).optional(),
        city: z.string().min(2).max(50).optional(),
        address: z.string().min(2).max(200).optional(),
        pincode: z.string().min(3).max(12).optional(),
        display_name: z.string().min(2).max(50).optional(),
        avatar_url: z.string().url().optional(),
    }).strict()
});

export const passwordUpdateSchema = z.object({
    body: z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    }).strict()
});

export const emailUpdateSchema = z.object({
    body: z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newEmail: z.string().email('Invalid email address'),
    }).strict()
});

export const walletUpdateSchema = z.object({
    body: z.object({
        walletAddress: z.string().min(10, 'Wallet address is too short').max(200),
    }).strict()
});

export const payoutRequestSchema = z.object({
    body: z.object({
        amount: z.number().positive('Amount must be positive'),
        walletAddress: z.string().min(10, 'Inavlid wallet address').max(200).optional(),
        method: z.string().optional().default('USDT_TRC20'),
        challenge_id: z.string().uuid('Invalid challenge ID')
    }).strict()
});

export const mt5AccountCreateSchema = z.object({
    body: z.object({
        account_type: z.enum(['phase1', 'phase2', 'funded', 'instant']),
        balance: z.number().positive(),
        leverage: z.number().positive()
    }).strict()
});

export const mt5BalanceAdjustSchema = z.object({
    body: z.object({
        amount: z.number().positive(),
        type: z.enum(['deposit', 'withdrawal']),
        comment: z.string().max(100).optional()
    }).strict()
});

export const mt5LeverageChangeSchema = z.object({
    body: z.object({
        login: z.number().positive(),
        leverage: z.number().positive().max(500)
    }).strict()
});

export const mt5AssignSchema = z.object({
    body: z.object({
        email: z.string().email(),
        mt5Group: z.string().min(1),
        accountSize: z.number().positive(),
        planType: z.string().min(1),
        note: z.string().min(1),
        imageUrl: z.string().url(),
        competitionId: z.string().uuid().optional().nullable()
    }).strict()
});
