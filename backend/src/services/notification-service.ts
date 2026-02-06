
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials for NotificationService');
}

const supabase: SupabaseClient = createClient(supabaseUrl!, supabaseKey!);

export type NotificationType = 'info' | 'warning' | 'error' | 'success' | 'payout' | 'kyc' | 'risk';

export class NotificationService {
    static async createNotification(title: string, message: string, type: NotificationType, userId?: string, metadata: any = {}) {
        try {
            console.log(`[NotificationService] Creating notification: ${title}`);
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
