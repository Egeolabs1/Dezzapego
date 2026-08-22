import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

export type GlobalAnnouncementSettings = {
    enabled: boolean;
    message: string;
    scroll: boolean;
    speed: number;
    repeatCount: number;
    gap: number;
    backgroundColor: string;
    textColor: string;
};

export const DEFAULT_GLOBAL_ANNOUNCEMENT: GlobalAnnouncementSettings = {
    enabled: false,
    message: '',
    scroll: false,
    speed: 24,
    repeatCount: 1,
    gap: 24,
    backgroundColor: '#1d4ed8',
    textColor: '#ffffff',
};

type GlobalAnnouncementContextType = {
    announcement: GlobalAnnouncementSettings;
    loading: boolean;
    saveAnnouncement: (settings: GlobalAnnouncementSettings) => Promise<void>;
};

const GlobalAnnouncementContext = createContext<GlobalAnnouncementContextType | undefined>(undefined);

export function parseGlobalAnnouncement(value: unknown): GlobalAnnouncementSettings {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return DEFAULT_GLOBAL_ANNOUNCEMENT;
    }

    const raw = value as Record<string, unknown>;
    const speed = typeof raw.speed === 'number' && Number.isFinite(raw.speed)
        ? Math.min(60, Math.max(8, raw.speed))
        : DEFAULT_GLOBAL_ANNOUNCEMENT.speed;
    const repeatCount = typeof raw.repeatCount === 'number' && Number.isFinite(raw.repeatCount)
        ? Math.min(6, Math.max(1, Math.round(raw.repeatCount)))
        : DEFAULT_GLOBAL_ANNOUNCEMENT.repeatCount;
    const gap = typeof raw.gap === 'number' && Number.isFinite(raw.gap)
        ? Math.min(200, Math.max(0, Math.round(raw.gap)))
        : DEFAULT_GLOBAL_ANNOUNCEMENT.gap;
    const backgroundColor = typeof raw.backgroundColor === 'string' && /^#[0-9a-f]{6}$/i.test(raw.backgroundColor)
        ? raw.backgroundColor
        : DEFAULT_GLOBAL_ANNOUNCEMENT.backgroundColor;
    const textColor = typeof raw.textColor === 'string' && /^#[0-9a-f]{6}$/i.test(raw.textColor)
        ? raw.textColor
        : DEFAULT_GLOBAL_ANNOUNCEMENT.textColor;

    return {
        enabled: raw.enabled === true,
        message: typeof raw.message === 'string' ? raw.message.slice(0, 300) : '',
        scroll: raw.scroll === true,
        speed,
        repeatCount,
        gap,
        backgroundColor,
        textColor,
    };
}

export function GlobalAnnouncementProvider({ children }: { children: React.ReactNode }) {
    const [announcement, setAnnouncement] = useState<GlobalAnnouncementSettings>(DEFAULT_GLOBAL_ANNOUNCEMENT);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const fetchAnnouncement = async () => {
            const { data, error } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'global_announcement')
                .maybeSingle();

            if (!cancelled && !error) {
                setAnnouncement(parseGlobalAnnouncement(data?.value));
            }
            if (!cancelled) setLoading(false);
        };

        void fetchAnnouncement();
        const channel = supabase
            .channel('global_announcement_settings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings', filter: 'key=eq.global_announcement' }, () => {
                void fetchAnnouncement();
            })
            .subscribe();

        return () => {
            cancelled = true;
            supabase.removeChannel(channel);
        };
    }, []);

    const saveAnnouncement = async (settings: GlobalAnnouncementSettings) => {
        const normalized = parseGlobalAnnouncement(settings);
        const { error } = await supabase
            .from('system_settings')
            .upsert({ key: 'global_announcement', value: normalized, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (error) throw error;
        setAnnouncement(normalized);
    };

    const value = useMemo(() => ({ announcement, loading, saveAnnouncement }), [announcement, loading]);
    return <GlobalAnnouncementContext.Provider value={value}>{children}</GlobalAnnouncementContext.Provider>;
}

export function useGlobalAnnouncement() {
    const context = useContext(GlobalAnnouncementContext);
    if (!context) throw new Error('useGlobalAnnouncement must be used within a GlobalAnnouncementProvider');
    return context;
}
