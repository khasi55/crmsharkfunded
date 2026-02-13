import { Router, Response, Request } from 'express';
import multer from 'multer';
import { supabase } from '../lib/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/upload
router.post('/', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
    try {
        const file = req.file;
        const { bucket, path } = req.body;

        if (!file) {
            res.status(400).json({ error: 'No file provided' });
            return;
        }

        if (!bucket || !path) {
            res.status(400).json({ error: 'Bucket and path are required' });
            return;
        }

        console.log(`[Upload] Request: ${file.originalname} -> ${bucket}/${path}`);

        // Ensure bucket exists
        try {
            const { data: buckets, error: listError } = await supabase.storage.listBuckets();

            if (listError) {
                console.error('[Upload] Error listing buckets:', listError);
            }

            const bucketExists = buckets?.some(b => b.name === bucket);
            console.log(`[Upload] Bucket '${bucket}' exists: ${bucketExists}`);

            if (!bucketExists) {
                console.log(`[Upload] Creating bucket: ${bucket}`);
                const { error: createError } = await supabase.storage.createBucket(bucket, {
                    public: true,
                    fileSizeLimit: 10485760, // 10MB
                });

                if (createError) {
                    console.error('[Upload] Bucket creation failed:', createError);
                } else {
                    console.log(`[Upload] Bucket created: ${bucket}`);
                }
            }
        } catch (err) {
            console.error('[Upload] Bucket check/creation exception:', err);
        }

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (error) {
            console.error('[Upload] Supabase Error:', error);
            res.status(500).json({ error: error.message });
            return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);

        res.json({
            success: true,
            url: publicUrl,
            path: data.path
        });

    } catch (error: any) {
        console.error('[Upload] Unexpected Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
