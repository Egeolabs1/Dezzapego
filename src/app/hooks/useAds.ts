import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Ad, Seller } from '../../types';
import { PUBLIC_ENV } from '../../lib/publicEnv';

type PublicProfile = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    verified: boolean | null;
    created_at: string | null;
    account_type?: 'personal' | 'professional' | null;
    business_name?: string | null;
};

export type AdsFilters = {
    lat?: number;
    lng?: number;
    radius?: number;
};

export const PAGE_SIZE = 50;

export function useAds(filters?: AdsFilters) {
    const [ads, setAds] = useState<Ad[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const pageRef = useRef(0);
    const mountedRef = useRef(true);

    const fetchPage = useCallback(async (page: number, signal?: AbortSignal) => {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const supabaseUrl = PUBLIC_ENV.SUPABASE_URL;
        if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL') return [];

        let data: Record<string, unknown>[] | null = null;

        // 1. Radius Search (RPC)
        if (filters?.lat && filters?.lng && filters?.radius) {
            const { data: nearbyProps, error: rpcError } = await supabase
                .rpc('get_nearby_ads', {
                    user_lat: filters.lat,
                    user_lng: filters.lng,
                    radius_km: filters.radius
                });

            if (rpcError) throw rpcError;

            if (nearbyProps && nearbyProps.length > 0) {
                const ids = nearbyProps.map((p: { id: string }) => p.id);
                const { data: adData, error: adsError } = await supabase
                    .from('ads')
                    .select('*')
                    .eq('status', 'active')
                    .in('id', ids)
                    .range(from, to);

                if (adsError) throw adsError;
                data = adData;
            } else {
                data = [];
            }
        } else {
            // 2. Standard Search with pagination
            const { data: adData, error: adsError } = await supabase
                .from('ads')
                .select('*')
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .range(from, to);

            if (adsError) throw adsError;
            data = adData;
        }

        if (signal?.aborted) return [];

        // Check if we got a full page (if less than PAGE_SIZE, no more data)
        if (data && data.length < PAGE_SIZE) {
            setHasMore(false);
        }

        return data || [];
    }, [filters?.lat, filters?.lng, filters?.radius]);

    const mapAdsToTyped = useCallback(async (rawAds: Record<string, unknown>[]): Promise<Ad[]> => {
        if (rawAds.length === 0) return [];

        const userIds = Array.from(new Set(rawAds.map(ad => ad.user_id as string).filter(Boolean)));

        let profilesMap: Record<string, PublicProfile> = {};
        if (userIds.length > 0) {
            const { data: profiles } = await supabase.rpc('get_public_profiles', {
                p_ids: userIds,
            });
            if (profiles) {
                (profiles as PublicProfile[]).forEach((p) => {
                    profilesMap[p.id] = p;
                });
            }
        }

        return rawAds.map(item => {
            const profile = profilesMap[item.user_id as string];
            const { phone: _phone, ...sellerSnapshot } = (item.seller as Record<string, unknown>) || {};

            const seller: Seller = {
                ...(sellerSnapshot as Partial<Seller>),
                name: String(profile?.full_name || (item.seller as Record<string, unknown>)?.name || 'Usuário'),
                avatar_url: String(profile?.avatar_url || (item.seller as Record<string, unknown>)?.avatar_url || ''),
                verified: Boolean(profile?.verified ?? (item.seller as Record<string, unknown>)?.verified),
                memberSince: String(profile?.created_at || (item.seller as Record<string, unknown>)?.memberSince || new Date().toISOString()),
                type: (profile?.account_type || (item.seller as Record<string, unknown>)?.type) as Seller['type'],
            };

            return {
                ...item,
                seller,
                publishedAt: (item.created_at as string) || (item.publishedAt as string),
            } as Ad;
        });
    }, []);

    // Initial fetch
    useEffect(() => {
        mountedRef.current = true;
        const controller = new AbortController();

        async function loadInitial() {
            try {
                setLoading(true);
                setError(null);
                setHasMore(true);
                pageRef.current = 0;

                const rawAds = await fetchPage(0, controller.signal);
                if (!mountedRef.current || controller.signal.aborted) return;

                const mapped = await mapAdsToTyped(rawAds);
                if (!mountedRef.current || controller.signal.aborted) return;

                setAds(mapped);
            } catch (err: unknown) {
                if (controller.signal.aborted) return;
                setError(err instanceof Error ? err.message : 'Erro ao buscar anúncios.');
                setAds([]);
            } finally {
                if (mountedRef.current) setLoading(false);
            }
        }

        loadInitial();

        return () => {
            mountedRef.current = false;
            controller.abort();
        };
    }, [fetchPage, mapAdsToTyped]);

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;

        try {
            setLoadingMore(true);
            const nextPage = pageRef.current + 1;
            const rawAds = await fetchPage(nextPage);
            pageRef.current = nextPage;

            const mapped = await mapAdsToTyped(rawAds);
            setAds(prev => [...prev, ...mapped]);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar mais anúncios.');
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, fetchPage, mapAdsToTyped]);

    return { ads, loading, loadingMore, error, hasMore, loadMore };
}
