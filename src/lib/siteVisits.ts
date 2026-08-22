import { hasAnalyticsConsent } from './privacyConsent';

const VISIT_SESSION_KEY = 'dezzapego_visit_session_id';
const RECENT_VISIT_KEY_PREFIX = 'dezzapego_recent_visit_';
const FUNNEL_EVENT_PREFIX = '__event__/';

function getVisitSessionId() {
    const existing = sessionStorage.getItem(VISIT_SESSION_KEY);
    if (existing) return existing;

    const nextId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    sessionStorage.setItem(VISIT_SESSION_KEY, nextId);
    return nextId;
}

export async function trackSiteVisit(path: string) {
    if (typeof window === 'undefined') return;

    try {
        const recentKey = `${RECENT_VISIT_KEY_PREFIX}${path}`;
        const lastTrackedAt = Number(sessionStorage.getItem(recentKey) || 0);
        if (Date.now() - lastTrackedAt < 10_000) return;

        sessionStorage.setItem(recentKey, String(Date.now()));

        await fetch('/api/track-visit', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                path,
                sessionId: getVisitSessionId(),
                referrer: document.referrer || null,
            }),
        });
    } catch {
        // Analytics must never block browsing.
    }
}

export async function trackFunnelEvent(event: string) {
    if (typeof window === 'undefined') return;
    try {
        if (!hasAnalyticsConsent()) return;
        await fetch('/api/track-visit', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ path: `${FUNNEL_EVENT_PREFIX}${event}`.slice(0, 500), sessionId: getVisitSessionId() }),
            keepalive: true,
        });
    } catch {
        // Funnel telemetry must never block a user action.
    }
}
