import { supabase } from '../lib/supabase';

export interface AuditLogOptions {
    userId: string;
    email: string;
    action: string;
    resource: string;
    resourceId?: string;
    payload?: any;
    status: 'success' | 'failure';
    errorMessage?: string;
    ip?: string;
}

export async function logSecurityEvent(options: AuditLogOptions) {
    try {
        // Filter sensitive fields from payload
        const sanitizedPayload = { ...options.payload };
        const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'token', 'secret', 'key'];

        Object.keys(sanitizedPayload).forEach(key => {
            if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                sanitizedPayload[key] = '[REDACTED]';
            }
        });

        const level = options.status === 'success' ? 'INFO' : 'ERROR';
        const message = `Security Event: ${options.action} on ${options.resource} (${options.resourceId || 'N/A'})`;

        const { error } = await supabase.from('system_logs').insert({
            source: 'SecurityLogger',
            level: level,
            message: message,
            details: {
                user_id: options.userId,
                email: options.email,
                action: options.action,
                resource: options.resource,
                resource_id: options.resourceId,
                status: options.status,
                ip_address: options.ip,
                error_message: options.errorMessage,
                ...sanitizedPayload
            }
        });

        if (error) {
            // Log but do not throw - audit logging should not break business logic
            console.error('🛑 [SecurityLog] Database error (Non-fatal):', error.message);
        } else {
            console.log(`🛡️ [SecurityLog] ${options.status.toUpperCase()}: ${options.action} by ${options.email}`);
        }
    } catch (e: any) {
        // Catch-all for any other errors (e.g. connection issues)
        console.error('🛑 [SecurityLog] Logging check failed (Non-fatal):', e.message);
    }
}
