/** Versão da política alinhada ao texto em /privacidade — incremente quando mudar regras de cookies/dados. */
export const CONSENT_POLICY_VERSION = '2';

export const CONSENT_STORAGE_KEY = 'dezzapego_privacy_consent_v1';

export type ConsentState = {
    necessary: true;
    analytics: boolean;
    adsPersonalization: boolean;
    at: string;
    policyVersion?: string;
};

export function getConsent(): ConsentState | null {
    try {
        const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as ConsentState;
        if (
            parsed &&
            parsed.necessary === true &&
            typeof parsed.analytics === 'boolean' &&
            parsed.policyVersion === CONSENT_POLICY_VERSION
        ) {
            return {
                ...parsed,
                adsPersonalization:
                    typeof parsed.adsPersonalization === 'boolean'
                        ? parsed.adsPersonalization
                        : false,
            };
        }
        return null;
    } catch {
        return null;
    }
}

export function setConsent(consent: boolean | { analytics: boolean; adsPersonalization?: boolean }): void {
    const analytics = typeof consent === 'boolean' ? consent : consent.analytics;
    const adsPersonalization =
        typeof consent === 'boolean' ? consent : consent.adsPersonalization === true;
    const state: ConsentState = {
        necessary: true,
        analytics,
        adsPersonalization,
        at: new Date().toISOString(),
        policyVersion: CONSENT_POLICY_VERSION,
    };
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('dezzapego-consent-changed'));
}

export function hasConsentRecorded(): boolean {
    return getConsent() !== null;
}

export function hasAnalyticsConsent(): boolean {
    return getConsent()?.analytics === true;
}

export function hasAdsPersonalizationConsent(): boolean {
    return getConsent()?.adsPersonalization === true;
}

export const OPEN_CONSENT_EVENT = 'dezzapego-open-consent';

export function openConsentPreferences(): void {
    window.dispatchEvent(new CustomEvent(OPEN_CONSENT_EVENT));
}
