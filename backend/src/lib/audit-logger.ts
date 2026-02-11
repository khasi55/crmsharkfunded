import { supabase } from './supabase';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export class AuditLogger {
    static async logAction(params: {
        adminEmail: string;
        action: string;
        level?: LogLevel;
        source?: string;
        details?: any;
    }) {
        const { adminEmail, action, level = 'INFO', source = 'AdminPortal', details = {} } = params;

        try {
            const { error } = await supabase
                .from('system_logs')
                .insert({
                    source,
                    level,
                    message: `Admin Action: [${adminEmail}] ${action}`,
                    details: {
                        ...details,
                        admin_email: adminEmail,
                        action_type: action,
                        timestamp: new Date().toISOString()
                    }
                });

            if (error) {
                console.error('❌ [AuditLogger] Failed to save log to DB:', error.message);
            } else {
                console.log(`🛡️ [AuditLogger] [${adminEmail}] ${action}`);
            }
        } catch (err) {
            console.error('❌ [AuditLogger] Unexpected error:', err);
        }
    }

    static async info(adminEmail: string, action: string, details?: any) {
        return this.logAction({ adminEmail, action, level: 'INFO', details });
    }

    static async warn(adminEmail: string, action: string, details?: any) {
        return this.logAction({ adminEmail, action, level: 'WARN', details });
    }

    static async error(adminEmail: string, action: string, error: any, details?: any) {
        return this.logAction({
            adminEmail,
            action,
            level: 'ERROR',
            details: { ...details, error: error.message || error }
        });
    }
}
