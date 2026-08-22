import { Megaphone } from 'lucide-react';
import { useGlobalAnnouncement } from '../contexts/GlobalAnnouncementContext';

export function GlobalAnnouncementBanner() {
    const { announcement, loading } = useGlobalAnnouncement();
    const message = announcement.message.trim();

    if (loading || !announcement.enabled || !message) return null;

    const content = (key: string) => (
        <span key={key} className="inline-flex shrink-0 items-center gap-2 px-4 py-2 text-sm font-medium">
            <Megaphone className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{message}</span>
        </span>
    );

    const scrollingGroup = (key: string) => (
        <span
            key={key}
            className="global-announcement__group"
            style={{ columnGap: `${announcement.gap}px`, paddingRight: `${announcement.gap}px` }}
        >
            {Array.from({ length: announcement.repeatCount }, (_, index) => content(`${key}-${index}`))}
        </span>
    );

    return (
        <div
            className="global-announcement overflow-hidden"
            style={{ backgroundColor: announcement.backgroundColor, color: announcement.textColor }}
            role="status"
            aria-live="polite"
        >
            {announcement.scroll ? (
                <>
                    <span className="sr-only">{message}</span>
                    <div
                        aria-hidden="true"
                        className="global-announcement__ticker"
                        style={{ animationDuration: `${announcement.speed}s` }}
                    >
                        {scrollingGroup('first')}
                        {scrollingGroup('second')}
                    </div>
                </>
            ) : (
                <span className="inline-flex min-w-full items-center justify-center">{content('static')}</span>
            )}
        </div>
    );
}
