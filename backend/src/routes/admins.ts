import express, { Router, Response } from 'express';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { AuditLogger } from '../lib/audit-logger';
import bcrypt from 'bcrypt';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/admins - List all admins
// GET / - List all admins (super_admin only)
router.get('/', authenticate, requireRole(['super_admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { data: admins, error } = await supabase
            .from('admin_users')
            .select('id, email, full_name, role, permissions, last_seen, daily_login_count, last_login_date, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ admins });
    } catch (error: any) {
        console.error('Error fetching admins:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admins - Create new admin
// POST / - Create new admin (super_admin only)
router.post('/', authenticate, requireRole(['super_admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { email, password, full_name, role, permissions } = req.body;

        if (!email || !password || !full_name) {
            res.status(400).json({ error: 'Email, password, and full name are required' });
            return;
        }

        // Check if email already exists
        const { data: existing } = await supabase
            .from('admin_users')
            .select('id')
            .eq('email', email)
            .single();

        if (existing) {
            res.status(400).json({ error: 'Admin with this email already exists' });
            return;
        }

        // Hash password before storage
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert new admin
        const { data, error } = await supabase
            .from('admin_users')
            .insert([
                {
                    email,
                    password: hashedPassword,
                    full_name,
                    role: role || 'sub_admin',
                    permissions: permissions || [] // Save permissions array
                }
            ])
            .select()
            .single();

        if (error) throw error;

        AuditLogger.info(req.user?.email || 'admin', `Created new admin user: ${email}`, { email, role, category: 'AdminManagement' });
        res.json({ admin: data });
    } catch (error: any) {
        console.error('Error creating admin:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/admins/:id - Delete admin
// DELETE /:id - Delete admin (super_admin only)
router.delete('/:id', authenticate, requireRole(['super_admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            res.status(400).json({ error: 'Admin ID is required' });
            return;
        }

        const { error } = await supabase
            .from('admin_users')
            .delete()
            .eq('id', id);

        if (error) throw error;

        AuditLogger.warn(req.user?.email || 'admin', `Deleted admin user ID: ${id}`, { id, category: 'AdminManagement' });
        res.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting admin:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/admins/risk-violations/:id - Delete a risk violation
router.delete('/risk-violations/:id', authenticate, requireRole(['super_admin', 'admin', 'risk_admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            res.status(400).json({ error: 'Violation ID is required' });
            return;
        }

        const { error } = await supabase
            .from('advanced_risk_flags')
            .delete()
            .eq('id', id);

        if (error) throw error;

        AuditLogger.warn(req.user?.email || 'admin', `Deleted risk violation ID: ${id}`, { id, category: 'RiskManagement' });
        res.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting risk violation:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
