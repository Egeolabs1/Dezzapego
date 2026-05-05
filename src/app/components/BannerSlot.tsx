import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

type BannerPlacement = 'home_top' | 'category_top';

type Banner = {
    id: string;
    image_url: string;
    mobile_image_url?: string | null;
    title?: string | null;
    subtitle?: string | null;
    cta_label?: string | null;
    link?: string | null;
    alt_text?: string | null;
    active?: boolean | null;
    sort_order?: number | null;
    start_at?: string | null;
    end_at?: string | null;
};

type BannerSlotProps = {
    placement: BannerPlacement;
    className?: string;
};

function isVisibleBanner(banner: Banner) {
    const now = Date.now();
    const startsAfterNow = banner.start_at ? new Date(banner.start_at).getTime() > now : false;
    const endedBeforeNow = banner.end_at ? new Date(banner.end_at).getTime() < now : false;
    return banner.active !== false && !startsAfterNow && !endedBeforeNow;
}

export function BannerSlot({ placement, className = '' }: BannerSlotProps) {
    const [banner, setBanner] = useState<Banner | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        let ignore = false;

        async function fetchBanner() {
            try {
                const { data } = await supabase
                    .from('banners')
                    .select('*')
                    .eq('active', true)
                    .eq('placement', placement)
                    .order('sort_order', { ascending: true })
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (ignore) return;

                const visibleBanner = ((data || []) as Banner[]).find(isVisibleBanner) || null;
                setBanner(visibleBanner);
            } catch {
                if (!ignore) setBanner(null);
            }
        }

        fetchBanner();

        return () => {
            ignore = true;
        };
    }, [placement]);

    if (!banner) return null;

    const title = banner.title?.trim();
    const subtitle = banner.subtitle?.trim();
    const hasText = Boolean(title || subtitle || banner.cta_label);

    const handleClick = () => {
        if (!banner.link) return;
        if (banner.link.startsWith('http')) {
            window.open(banner.link, '_blank');
            return;
        }
        navigate(banner.link);
    };

    return (
        <section className={`mx-auto max-w-[1600px] px-2 md:px-4 ${className}`}>
            <button
                type="button"
                onClick={handleClick}
                disabled={!banner.link}
                className={`group relative block w-full overflow-hidden rounded-lg bg-gray-900 text-left shadow-sm ${banner.link ? 'cursor-pointer hover:opacity-95' : 'cursor-default'}`}
            >
                <picture className="block aspect-[8/3] min-h-[120px] md:min-h-[180px]">
                    {banner.mobile_image_url && (
                        <source media="(max-width: 767px)" srcSet={banner.mobile_image_url} />
                    )}
                    <img
                        src={banner.image_url}
                        alt={banner.alt_text || title || 'Banner Dezzapego'}
                        className="h-full w-full object-cover"
                        loading="lazy"
                    />
                </picture>

                {hasText && (
                    <div className="absolute inset-0 flex items-center bg-black/35 p-5 text-white md:p-8">
                        <div className="max-w-2xl">
                            {title && <h2 className="text-xl font-bold drop-shadow md:text-3xl">{title}</h2>}
                            {subtitle && <p className="mt-2 text-sm text-white/90 drop-shadow md:text-base">{subtitle}</p>}
                            {banner.cta_label && banner.link && (
                                <span className="mt-4 inline-flex rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow transition-colors group-hover:bg-blue-50">
                                    {banner.cta_label}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </button>
        </section>
    );
}
