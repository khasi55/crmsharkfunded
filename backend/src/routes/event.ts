
import express from 'express';
import { EventEntryService } from '../services/event-entry-service';

const router = express.Router();

router.post('/verify', async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            res.status(400).json({ valid: false, message: 'Missing pass code' });
            return;
        }

        const result = await EventEntryService.verifyPass(code);

        if (result.valid) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }

    } catch (error: any) {
        console.error('Error verifying pass:', error);
        res.status(500).json({ valid: false, message: 'Internal Server Error' });
    }
});

export default router;
