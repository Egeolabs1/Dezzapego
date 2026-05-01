import { useEffect } from 'react';
import { getConsent, hasAdsPersonalizationConsent } from '../../lib/privacyConsent';

declare global {
    interface Window {
        adsbygoogle?: unknown[];
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
    }
}

const ADSENSE_SCRIPT_ID = 'dezzapego-adsense-loader';

function getAdSenseClient(): string | null {
    const client = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined;
    return client?.trim() || null;
}

function ensureGtagConsentBridge() {
    window.dataLayer = window.dataLayer || [];
    window.gtag =
        window.gtag ||
        function gtag(...args: unknown[]) {
            window.dataLayer?.push(args);
        };
}

function applyConsentMode() {
    ensureGtagConsentBridge();
    const personalizedAds = hasAdsPersonalizationConsent();
    window.gtag?.('consent', 'update', {
        ad_storage: personalizedAds ? 'granted' : 'denied',
        ad_user_data: personalizedAds ? 'granted' : 'denied',
        ad_personalization: personalizedAds ? 'granted' : 'denied',
        analytics_storage: getConsent()?.analytics ? 'granted' : 'denied',
    });
}

export function AdSenseLoader() {
    useEffect(() => {
        const client = getAdSenseClient();
        if (!client || document.getElementById(ADSENSE_SCRIPT_ID)) return;

        ensureGtagConsentBridge();
        window.gtag?.('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied',
        });
        applyConsentMode();

        const script = document.createElement('script');
        script.id = ADSENSE_SCRIPT_ID;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
        document.head.appendChild(script);

        const onConsentChanged = () => applyConsentMode();
        window.addEventListener('dezzapego-consent-changed', onConsentChanged);

        return () => {
            window.removeEventListener('dezzapego-consent-changed', onConsentChanged);
        };
    }, []);

    return null;
}

