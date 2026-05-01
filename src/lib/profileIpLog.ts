import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from './supabase';
import { fetchClientPublicIp } from './clientIp';
import type { Profile } from '../types';

/** Intervalo mínimo entre gravações de último acesso (evita excesso no SPA). */
/** Evita escritas repetidas ao DB no SPA (não substitui log por requisição no servidor). */
const ACCESS_LOG_MIN_MS = 90 * 1000;

function accessThrottleKey(userId: string) {
    return `dezzapego_profile_access_ts_${userId}`;
}

function canFlushAccess(userId: string): boolean {
    try {
        const now = Date.now();
        const last = parseInt(sessionStorage.getItem(accessThrottleKey(userId)) || '0', 10);
        return Number.isFinite(now - last) && now - last >= ACCESS_LOG_MIN_MS;
    } catch {
        return true;
    }
}

export function markAccessLoggedNow(userId: string) {
    try {
        sessionStorage.setItem(accessThrottleKey(userId), String(Date.now()));
    } catch {
        /* ignore */
    }
}

/** Pré-preenche IP de cadastro (se vazio) e registra último acesso conforme throttle. */
export async function flushProfileSignupAndAccess(profile: Profile, userId: string): Promise<void> {
    const ip = await fetchClientPublicIp();

    try {
        if (!profile.signup_ip && ip) {
            const { error } = await supabase.rpc('record_my_signup_meta', { p_ip: ip });
            if (error) console.warn('[profileIpLog] record_my_signup_meta', error);
        }
    } catch (e) {
        console.warn('[profileIpLog] signup meta', e);
    }

    if (!canFlushAccess(userId)) return;

    try {
        markAccessLoggedNow(userId);
        const { error } = await supabase.rpc('record_my_access', { p_ip: ip ?? '' });
        if (error) console.warn('[profileIpLog] record_my_access', error);
    } catch (e) {
        console.warn('[profileIpLog] access', e);
    }
}

/** Só atualiza último acesso (navegação / retorno ao app), respeita throttle global por usuário. */
export async function flushProfileAccessOnly(userId: string): Promise<void> {
    if (!canFlushAccess(userId)) return;
    const ip = await fetchClientPublicIp();

    try {
        markAccessLoggedNow(userId);
        const { error } = await supabase.rpc('record_my_access', { p_ip: ip ?? '' });
        if (error) console.warn('[profileIpLog] record_my_access', error);
    } catch (e) {
        console.warn('[profileIpLog] access only', e);
    }
}

/** Em mudanças de rota grava último acesso (mesmo throttle que o AuthContext). */
export function useProfileIpOnNavigation(userId: string | undefined | null, enabled: boolean) {
    const location = useLocation();
    useEffect(() => {
        if (!userId || !enabled) return;
        void flushProfileAccessOnly(userId);
    }, [enabled, userId, location.pathname, location.search]);
}

/** Após criar conta com sessão: IP de cadastro + primeiro acesso. */
export async function recordSignupIpAndFirstAccess(opts: {
    signupIpHint?: string | null;
    userId?: string | null;
}): Promise<void> {
    const ip =
        opts.signupIpHint && opts.signupIpHint.trim()
            ? opts.signupIpHint.trim().slice(0, 64)
            : (await fetchClientPublicIp());

    try {
        if (ip) {
            await supabase.rpc('record_my_signup_meta', { p_ip: ip });
        }
    } catch (e) {
        console.warn('[profileIpLog] record signup post-register', e);
    }

    try {
        await supabase.rpc('record_my_access', { p_ip: ip ?? '' });
        if (opts.userId) {
            markAccessLoggedNow(opts.userId);
        }
    } catch (e) {
        console.warn('[profileIpLog] first access post-register', e);
    }
}
