import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Ad } from '../../types';

const mockAds: Ad[] = [];

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
    radius?: number; // in km
};

export function useAds(filters?: AdsFilters) {
    const [ads, setAds] = useState<Ad[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchAds() {
            try {
                setLoading(true);

                // Check if we have credentials
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL') {
                    if (import.meta.env.DEV) {
                        console.debug('[useAds] Supabase não configurado; lista vazia.');
                    }
                    setAds(mockAds);
                    setLoading(false);
                    return;
                }

                let data: any[] | null = null;

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
                        const ids = nearbyProps.map((p: any) => p.id);
                        const { data: adData, error: adsError } = await supabase
                            .from('ads')
                            .select('*')
                            .in('id', ids);

                        if (adsError) throw adsError;
                        data = adData;
                    } else {
                        data = [];
                    }
                } else {
                    // 2. Standard Search
                    const { data: adData, error: adsError } = await supabase
                        .from('ads')
                        .select('*');

                    if (adsError) throw adsError;
                    data = adData;
                }

                if (data && data.length > 0) {
                    // Extract User IDs
                    const userIds = Array.from(new Set(data.map(ad => ad.user_id).filter(Boolean)));

                    // Fetch Profiles
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

                    // Map Ads with Live Profile Data
                    const mappedAds: Ad[] = data.map(item => {
                        const profile = profilesMap[item.user_id];
                        const { phone: _phone, ...sellerSnapshot } = item.seller || {};

                        // Merge profile into seller (taking precedence over snapshot)
                        const seller = {
                            ...sellerSnapshot,
                            name: profile?.full_name || item.seller?.name || 'Usuário',
                            avatar_url: profile?.avatar_url || item.seller?.avatar_url,
                            verified: profile?.verified ?? item.seller?.verified,
                            memberSince: profile?.created_at || item.seller?.memberSince || new Date().toISOString(),
                            type: profile?.account_type || item.seller?.type,
                        };

                        return {
                            ...item,
                            seller,
                            publishedAt: item.created_at || item.publishedAt,
                        };
                    });

                    setAds(mappedAds);
                } else {
                    setAds([]);
                }

            } catch (err: any) {
                console.error('Error fetching ads:', err);
                setError(err.message);
                setAds([]); // Error fallback to empty list
            } finally {
                setLoading(false);
            }
        }

        fetchAds();
    }, [filters?.lat, filters?.lng, filters?.radius]);

    return { ads, loading, error };
}
