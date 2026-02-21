
import { supabase } from '../lib/supabase';

export type NotificationType = 'info' | 'warning' | 'error' | 'success' | 'payout' | 'kyc' | 'risk';

export class NotificationService {
    static async createNotification(title: string, message: string, type: NotificationType, userId?: string, metadata: any = {}) {
        try {
            const DEBUG = process.env.DEBUG === 'true';
            if (DEBUG) console.log(`[NotificationService] Creating notification: ${title}`);
            const { error } = await supabase
                .from('notifications')
                .insert({
                    title,
                    message,
                    type,
                    user_id: userId, // Optional: if linked to a specific user
                    read: false,
                    metadata,
                    created_at: new Date().toISOString()
                });

            if (error) {
                console.error('[NotificationService] Error creating notification:', error);
            }
        } catch (err) {
            console.error('[NotificationService] Unexpected error:', err);
        }
    }
}
