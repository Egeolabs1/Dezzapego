/** Nome público do site — usado em títulos e JSON-LD */
export const SITE_NAME = 'Dezzapego';

const DEFAULT_ORIGIN = 'https://dezzapego.com';

/**
 * Origem canônica do site (sem barra final).
 * Preferir `VITE_SITE_URL` no deploy para OG/crawler.
 */
export function getSiteOrigin(): string {
    const env = import.meta.env.VITE_SITE_URL as string | undefined;
    if (env && /^https?:\/\//i.test(env)) {
        return env.replace(/\/$/, '');
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin;
    }
    return DEFAULT_ORIGIN;
}

/** Converte path ou URL relativa em URL absoluta para meta tags e schema.org */
export function toAbsoluteUrl(href?: string): string {
    if (!href) return getSiteOrigin();
    const trimmed = href.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const base = getSiteOrigin();
    return trimmed.startsWith('/') ? `${base}${trimmed}` : `${base}/${trimmed}`;
}

/** Imagem padrão para Open Graph / Twitter (ideal: PNG/JPG 1200×630 em `/public`, definir em VITE_OG_IMAGE). */
export function getDefaultShareImagePath(): string {
    const v = import.meta.env.VITE_OG_IMAGE as string | undefined;
    return v && v.trim() ? v.trim() : '/icon.svg';
}
