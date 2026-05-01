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

export async function approveProfileVerification(userId: string): Promise<void> {
    const { error } = await supabase
        .from('profiles')
        .update({
            verified: true,
            verification_status: 'verified',
            verification_rejection_reason: null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

    if (error) throw error;
}

export async function rejectProfileVerification(userId: string, reason: string): Promise<void> {
    const msg = reason.trim() || DEFAULT_VERIFICATION_REJECTION_REASON;
    const { error } = await supabase
        .from('profiles')
        .update({
            verified: false,
            verification_status: 'rejected',
            verification_rejection_reason: msg,
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

    if (error) throw error;
}
