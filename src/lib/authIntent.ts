const AUTH_NEXT_KEY = 'dezzapego_auth_next';

export function getSafeNextPath(value: string | null | undefined, fallback = '/') {
    if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
    return value;
}

export function rememberAuthNext(path: string) {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.setItem(AUTH_NEXT_KEY, getSafeNextPath(path));
    } catch {
        /* ignore storage failures */
    }
}

export function consumeAuthNext(fallback = '/') {
    if (typeof window === 'undefined') return fallback;
    try {
        const next = getSafeNextPath(window.sessionStorage.getItem(AUTH_NEXT_KEY), fallback);
        window.sessionStorage.removeItem(AUTH_NEXT_KEY);
        return next;
    } catch {
        return fallback;
    }
}

export function buildAuthPath(path: string, next: string) {
    const params = new URLSearchParams({ next });
    return `${path}?${params.toString()}`;
}
