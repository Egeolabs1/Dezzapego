import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackSiteVisit } from '../../lib/siteVisits';

export function useSiteVisitTracking() {
    const location = useLocation();

    useEffect(() => {
        trackSiteVisit(`${location.pathname}${location.search}`);
    }, [location.pathname, location.search]);
}
