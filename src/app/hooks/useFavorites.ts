import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export function useFavorites() {
    const { user } = useAuth();
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    // Fetch favorites on mount or user change
    useEffect(() => {
        if (!user) {
            setFavorites(new Set());
            setLoading(false);
            return;
        }

        async function fetchFavorites() {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('favorites')
                    .select('ad_id')
                    .eq('user_id', user!.id);

                if (error) throw error;

                const favoriteIds = new Set(data.map(f => f.ad_id));
                setFavorites(favoriteIds);
            } catch (error) {
                console.error('Error fetching favorites:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchFavorites();
    }, [user]);

    const toggleFavorite = useCallback(async (adId: string) => {
        if (!user) {
            toast.error('Faça login para salvar favoritos.');
            return;
        }

        // Optimistic UI update
        const isFavorited = favorites.has(adId);
        setFavorites(prev => {
            const next = new Set(prev);
            if (isFavorited) {
                next.delete(adId);
            } else {
                next.add(adId);
            }
            return next;
        });

        try {
            if (isFavorited) {
                // Remove
                const { error } = await supabase
                    .from('favorites')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('ad_id', adId);

                if (error) throw error;
            } else {
                // Add
                const { error } = await supabase
                    .from('favorites')
                    .insert({ user_id: user.id, ad_id: adId });

                if (error) throw error;
                toast.success('Adicionado aos favoritos!');
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            toast.error('Erro ao atualizar favoritos.');
            // Revert on error
            setFavorites(prev => {
                const next = new Set(prev);
                if (isFavorited) {
                    next.add(adId);
                } else {
                    next.delete(adId);
                }
                return next;
            });
        }
    }, [user, favorites]);

    return { favorites, toggleFavorite, loading };
}
