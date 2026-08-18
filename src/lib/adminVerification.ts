import { supabase } from './supabase';

export const DEFAULT_VERIFICATION_REJECTION_REASON =
    'Documentação não aprovada. Envie fotos mais nítidas.';

export function parseVerificationDocs(raw: unknown): { doc: string[]; selfie: string[] } {
    if (!raw || typeof raw !== 'object') return { doc: [], selfie: [] };
    const o = raw as Record<string, unknown>;
    const doc = Array.isArray(o.doc) ? (o.doc as string[]).filter(Boolean) : [];
    const selfie = Array.isArray(o.selfie) ? (o.selfie as string[]).filter(Boolean) : [];
    return { doc, selfie };
}

async function adminFetch(url: string, body: Record<string, unknown>) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Não autenticado');
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Falha na operação admin');
    }
}

export async function approveProfileVerification(userId: string): Promise<void> {
    await adminFetch('/api/admin/verify', { user_id: userId, action: 'approve' });
}

export async function rejectProfileVerification(userId: string, reason: string): Promise<void> {
    await adminFetch('/api/admin/verify', { user_id: userId, action: 'reject', reason });
}
