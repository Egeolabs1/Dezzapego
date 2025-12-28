import { supabase } from './supabase';

export async function logAdminAction(adminEmail: string | undefined, action: string, details: string) {
    if (!adminEmail) return;

    try {
        await supabase.from('audit_logs').insert({
            admin_email: adminEmail,
            action,
            details
        });
    } catch (error) {
        console.error('Failed to log admin action:', error);
    }
}
