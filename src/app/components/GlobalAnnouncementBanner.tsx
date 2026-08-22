import { Megaphone } from 'lucide-react';
import { useGlobalAnnouncement } from '../contexts/GlobalAnnouncementContext';

export function GlobalAnnouncementBanner() {
    const { announcement, loading } = useGlobalAnnouncement();
    const message = announcement.message.trim();

    if (loading || !announcement.enabled || !message) return null;

    const content = (
        <span className="inline-flex min-w-full items-center justify-center gap-2 px-4 py-2 text-sm font-medium">
            <Megaphone className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{message}</span>
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
                <div
                    className="global-announcement__ticker whitespace-nowrap"
                    style={{ animationDuration: `${announcement.speed}s` }}
                >
                    {content}{content}
                </div>
            ) : content}
        </div>
    );
}
