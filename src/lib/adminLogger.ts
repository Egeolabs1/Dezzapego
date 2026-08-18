import { supabase } from './supabase';

export async function logAdminAction(_adminEmail: string | undefined, action: string, details: string) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        await fetch('/api/admin/log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ action, details }),
        });
    } catch (error) {
        console.error('Failed to log admin action:', error);
    }
}
