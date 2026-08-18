import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { hasAnalyticsConsent } from '../../lib/privacyConsent';
import { trackSiteVisit } from '../../lib/siteVisits';

function trackIfAllowed(path: string) {
    if (!hasAnalyticsConsent()) return;
    trackSiteVisit(path);
}

export function useSiteVisitTracking() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const search = searchParams.toString() ? `?${searchParams.toString()}` : '';

    useEffect(() => {
        trackIfAllowed(`${pathname}${search}`);
    }, [pathname, search]);

    useEffect(() => {
        const onConsent = () =>
            trackIfAllowed(`${pathname}${search}`);
        window.addEventListener('dezzapego-consent-changed', onConsent);
        return () => window.removeEventListener('dezzapego-consent-changed', onConsent);
    }, [pathname, search]);
}
