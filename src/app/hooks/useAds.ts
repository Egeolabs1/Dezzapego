import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { mockAds } from '../data/mockAds';
import type { Ad } from '../../types';

export function useAds() {
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
                    console.log('No Supabase credentials found, using mock data.');
                    setAds(mockAds);
                    setLoading(false);
                    return;
                }

                const { data, error } = await supabase
                    .from('ads')
                    .select('*');

                if (error) {
                    throw error;
                }

                if (data && data.length > 0) {
                    // We need to map Supabase data to our Ad type
                    // This assumes the Supabase table has similar structure
                    // Adjust mapping as needed based on actual table schema
                    const mappedAds: Ad[] = data.map(item => ({
                        ...item,
                        // Ensure dates are strings if Supabase returns Date objects
                        publishedAt: item.created_at || item.publishedAt,
                    }));
                    setAds(mappedAds);
                } else {
                    console.log('No ads found in Supabase, utilizing mock data for demonstration.');
                    setAds(mockAds);
                }

            } catch (err: any) {
                console.error('Error fetching ads:', err);
                setError(err.message);
                // Fallback to mock data on error for now? 
                // Let's fallback so the app shouldn't break during setup
                setAds(mockAds);
            } finally {
                setLoading(false);
            }
        }

        fetchAds();
    }, []);

    return { ads, loading, error };
}
