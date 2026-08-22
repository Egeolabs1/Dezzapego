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

        let wasFavorited = false;

        // Optimistic UI update using functional state
        setFavorites(prev => {
            wasFavorited = prev.has(adId);
            const next = new Set(prev);
            if (wasFavorited) {
                next.delete(adId);
            } else {
                next.add(adId);
            }
            return next;
        });

        try {
            if (wasFavorited) {
                const { error } = await supabase
                    .from('favorites')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('ad_id', adId);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('favorites')
                    .insert({ user_id: user.id, ad_id: adId });

                if (error) throw error;
                const { data: adOwner } = await supabase.from('ads').select('user_id, title').eq('id', adId).maybeSingle();
                if (adOwner?.user_id && adOwner.user_id !== user.id) {
                    void supabase.from('notifications').insert({ user_id: adOwner.user_id, title: 'Seu anúncio foi salvo', message: `Alguém adicionou "${adOwner.title || 'seu anúncio'}" aos favoritos.`, type: 'favorite', read: false });
                }
                toast.success('Adicionado aos favoritos!');
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            toast.error('Erro ao atualizar favoritos.');
            // Revert on error
            setFavorites(prev => {
                const next = new Set(prev);
                if (wasFavorited) {
                    next.add(adId);
                } else {
                    next.delete(adId);
                }
                return next;
            });
        }
    }, [user]);

    return { favorites, toggleFavorite, loading };
}
