/**
 * Obtém o IP público visto pela internet para este cliente (útil quando não há backend com cabeçalhos de proxy).
 * Fonte configurável para reduzir ponto único de falha.
 */
export async function fetchClientPublicIp(): Promise<string | null> {
    const endpoints = ['https://api.ipify.org?format=json', 'https://ipv4.ipify.org?format=json'];

    for (const url of endpoints) {
        try {
            const ctrl = new AbortController();
            const t = window.setTimeout(() => ctrl.abort(), 4500);
            const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
            window.clearTimeout(t);
            if (!res.ok) continue;
            const data = (await res.json()) as { ip?: string };
            if (typeof data.ip === 'string' && data.ip.trim().length > 0) {
                return data.ip.trim().slice(0, 64);
            }
        } catch {
            /* tenta próximo endpoint */
        }
    }
    return null;
}
