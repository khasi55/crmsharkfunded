import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/certificates - List all user certificates
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const { data: certificates, error } = await supabase
            .from('certificates')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching certificates:', error);
            res.status(500).json({ error: 'Failed to fetch certificates' });
            return;
        }

        res.json({ certificates: certificates || [] });

    } catch (error: any) {
        console.error('Certificates API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/certificates/:id - Get specific certificate
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const { id } = req.params;

        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const { data: certificate, error } = await supabase
            .from('certificates')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (error) {
            console.error('Error fetching certificate:', error);
            res.status(404).json({ error: 'Certificate not found' });
            return;
        }

        res.json({ certificate });

    } catch (error: any) {
        console.error('Certificate fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
