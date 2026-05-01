import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { hasAnalyticsConsent } from '../../lib/privacyConsent';
import { trackSiteVisit } from '../../lib/siteVisits';

function trackIfAllowed(path: string) {
    if (!hasAnalyticsConsent()) return;
    trackSiteVisit(path);
}

export function useSiteVisitTracking() {
    const location = useLocation();

    useEffect(() => {
        trackIfAllowed(`${location.pathname}${location.search}`);
    }, [location.pathname, location.search]);

    useEffect(() => {
        const onConsent = () =>
            trackIfAllowed(`${location.pathname}${location.search}`);
        window.addEventListener('dezzapego-consent-changed', onConsent);
        return () => window.removeEventListener('dezzapego-consent-changed', onConsent);
    }, [location.pathname, location.search]);
}
