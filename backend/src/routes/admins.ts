import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in admins.ts");
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

// GET /api/admins - List all admins
router.get('/', async (req, res) => {
    try {
        const { data: admins, error } = await supabase
            .from('admin_users')
            .select('id, email, full_name, role, permissions, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ admins });
    } catch (error: any) {
        console.error('Error fetching admins:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admins - Create new admin
router.post('/', async (req, res) => {
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

        // Insert new admin
        // Note: Password stored in plain text as per current system design (verify_admin_credentials)
        const { data, error } = await supabase
            .from('admin_users')
            .insert([
                {
                    email,
                    password,
                    full_name,
                    role: role || 'sub_admin',
                    permissions: permissions || [] // Save permissions array
                }
            ])
            .select()
            .single();

        if (error) throw error;

        res.json({ admin: data });
    } catch (error: any) {

        console.error('Error creating admin:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/admins/:id - Delete admin
router.delete('/:id', async (req, res) => {
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

        res.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting admin:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
