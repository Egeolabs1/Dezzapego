import { useEffect, useRef, useState } from 'react';
import { PUBLIC_ENV, isPublicDevMode } from '../../lib/publicEnv';
import { hasAdsPersonalizationConsent } from '../../lib/privacyConsent';

declare global {
    interface Window {
        adsbygoogle?: unknown[];
    }
}

type AdSenseSlotProps = {
    slot?: string;
    format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
    layout?: string;
    layoutKey?: string;
    className?: string;
    minHeightClass?: string;
};

function getAdSenseClient(): string | null {
    const client = PUBLIC_ENV.ADSENSE_CLIENT;
    return client?.trim() || null;
}

function isAdSenseTestMode(): boolean {
    return isPublicDevMode() || PUBLIC_ENV.ADSENSE_TEST_MODE === 'true';
}

export function AdSenseSlot({
    slot,
    format = 'auto',
    layout,
    layoutKey,
    className = '',
    minHeightClass = 'min-h-[120px]',
}: AdSenseSlotProps) {
    const pushed = useRef(false);
    const client = getAdSenseClient();
    const [adsEnabled, setAdsEnabled] = useState(false);

    useEffect(() => {
        const syncConsent = () => setAdsEnabled(hasAdsPersonalizationConsent());
        syncConsent();
        window.addEventListener('dezzapego-consent-changed', syncConsent);
        return () => window.removeEventListener('dezzapego-consent-changed', syncConsent);
    }, []);

    useEffect(() => {
        if (!client || !slot || !adsEnabled || pushed.current) return;
        try {
            window.adsbygoogle = window.adsbygoogle || [];
            window.adsbygoogle.push({});
            pushed.current = true;
        } catch (error) {
            console.warn('[AdSenseSlot] Falha ao inicializar slot.', error);
        }
    }, [adsEnabled, client, slot]);

    if (!client || !slot || !adsEnabled) return null;

    return (
        <div
            className={`w-full overflow-hidden rounded-xl border border-gray-100 bg-gray-50 ${minHeightClass} ${className}`}
            aria-label="Publicidade"
        >
            <ins
                className={`adsbygoogle block ${minHeightClass}`}
                data-ad-client={client}
                data-ad-slot={slot}
                data-ad-format={format}
                data-full-width-responsive="true"
                {...(isAdSenseTestMode() ? { 'data-adtest': 'on' } : {})}
                {...(layout ? { 'data-ad-layout': layout } : {})}
                {...(layoutKey ? { 'data-ad-layout-key': layoutKey } : {})}
            />
        </div>
    );
}

