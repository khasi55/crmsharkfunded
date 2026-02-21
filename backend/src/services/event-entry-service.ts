
import { supabase } from '../lib/supabase';

export class EventEntryService {

    /**
     * Create a new entry pass for an attendee
     */
    static async createPass(name: string, email: string, eventSlug: string = 'shark-funded-exclusive-event'): Promise<string> {
        // Generate a simplified unique code: SF-{RANDOM_6_CHARS}
        const uniqueSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
        const code = `SF-${uniqueSuffix}`;

        const { error } = await supabase
            .from('event_entry_passes')
            .insert({
                code: code,
                event_slug: eventSlug,
                attendee_name: name,
                attendee_email: email,
                is_used: false
            });

        if (error) {
            console.error('Error creating event pass:', error);
            // If duplicate (collision), try once more
            if (error.code === '23505') { // Unique violation
                return this.createPass(name, email, eventSlug);
            }
            throw new Error(`Failed to create pass: ${error.message}`);
        }

        return code;
    }

    /**
     * Verify and redeem a pass
     */
    static async verifyPass(code: string): Promise<{ valid: boolean; message: string; data?: any }> {
        // 1. Fetch the pass
        const { data, error } = await supabase
            .from('event_entry_passes')
            .select('*')
            .eq('code', code)
            .single();

        if (error || !data) {
            return { valid: false, message: 'Invalid Pass Code' };
        }

        // 2. Check if already used
        if (data.is_used) {
            return {
                valid: false,
                message: `Pass already used on ${new Date(data.used_at).toLocaleString()}`,
                data: data
            };
        }

        // 3. Mark as used
        const { error: updateError } = await supabase
            .from('event_entry_passes')
            .update({
                is_used: true,
                used_at: new Date().toISOString()
            })
            .eq('id', data.id);

        if (updateError) {
            return { valid: false, message: 'System Error: Could not redeem pass' };
        }

        return {
            valid: true,
            message: 'Access Granted',
            data: data
        };
    }
}
