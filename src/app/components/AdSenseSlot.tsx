import { useEffect, useRef } from 'react';
import { PUBLIC_ENV, isPublicDevMode } from '../../lib/publicEnv';

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

    useEffect(() => {
        if (!client || !slot || pushed.current) return;
        try {
            window.adsbygoogle = window.adsbygoogle || [];
            window.adsbygoogle.push({});
            pushed.current = true;
        } catch (error) {
            console.warn('[AdSenseSlot] Falha ao inicializar slot.', error);
        }
    }, [client, slot]);

    if (!client || !slot) return null;

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

