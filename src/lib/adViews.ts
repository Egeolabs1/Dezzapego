import { supabase } from './supabase';

const SESSION_KEY_PREFIX = 'dezzapego_viewed_ad_';

/**
 * Incrementa 1 visualização por sessão para o anúncio.
 * Evita múltiplos increments no mesmo ad durante a mesma aba/sessão.
 */
export async function incrementAdViewOnce(adId?: string): Promise<number | null> {
    if (!adId) return null;
    const sessionKey = `${SESSION_KEY_PREFIX}${adId}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey) === '1') {
        return null;
    }

    const { data, error } = await supabase
        .from('ads')
        .select('views')
        .eq('id', adId)
        .single();

    if (error || !data) return null;

    const currentViews = Number(data.views || 0);
    const nextViews = currentViews + 1;

    const { error: updateError } = await supabase
        .from('ads')
        .update({ views: nextViews })
        .eq('id', adId);

    if (updateError) return null;

    if (typeof window !== 'undefined') {
        sessionStorage.setItem(sessionKey, '1');
    }
    return nextViews;
}
