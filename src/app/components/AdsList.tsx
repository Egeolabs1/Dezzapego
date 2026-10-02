import { Bell, BellOff, BookmarkPlus, Heart, ImageIcon, LayoutGrid, List as ListIcon, MapPin, Share2, Trash2 } from 'lucide-react';
import { AdCardSkeleton } from './ui/skeleton';

import type { Ad } from '../../types';
import { useEffect, useMemo, useState } from 'react';
import { formatPrice, formatDate } from '../../lib/formatters';
import { useAds } from '../hooks/useAds';
import Link from 'next/link';
import { getCategoryFields } from '../data/categorySpecs';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useFilter } from '../contexts/FilterContext';
import { buildSearchLabel, isLowQualityPublicAd, readSavedSearches, removeSavedSearch, saveSearch, withDetailsFiltersInUrl, type SavedSearch } from '../../lib/marketplaceQuality';
import { getCategoryPath } from '../../lib/categoryRoutes';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { hasSearchAlertCriteria } from '../../lib/searchAlertMatching';
import type { MouseEvent } from 'react';

type AdsListProps = {
  selectedCategory: string;
  selectedSubcategory: string;
  selectedTransactionType?: 'venda' | 'aluguel' | '';
  selectedState: string;
  selectedCity?: string;
  advertiserType?: 'ambos' | 'particular' | 'profissional';
  sortBy?: 'relevancia' | 'recentes' | 'menor-preco' | 'maior-preco';
  priceRange: [number, number];
  searchQuery: string;
  onAdClick: (ad: Ad) => void;
  favorites: Set<string>;
  onToggleFavorite: (adId: string) => void;
  detailsFilters?: Record<string, any>;
  radius?: number;
  userLocation?: { lat: number; lng: number } | null;
};

export function AdsList({
  selectedCategory,
  selectedSubcategory,
  selectedTransactionType = '',
  selectedState,
  selectedCity = '',
  advertiserType = 'ambos',
  sortBy = 'relevancia',
  priceRange,
  searchQuery,
  onAdClick: _onAdClick,
  favorites,
  onToggleFavorite,
  detailsFilters = {},
  radius,
  userLocation
}: AdsListProps) {
  const router = useRouter();
  const { setSearchQuery } = useFilter();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => readSavedSearches());
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [emailAlertId, setEmailAlertId] = useState<string | null>(null);
  const [emailAlertBusy, setEmailAlertBusy] = useState(false);
  const { user } = useAuth();

  const currentFilters = {
    selectedCategory, selectedSubcategory, selectedTransactionType, selectedState, selectedCity,
    advertiserType, priceRange, searchQuery,
  };
  const currentSearchUrl = typeof window === 'undefined' ? '' : withDetailsFiltersInUrl(window.location.pathname, window.location.search, detailsFilters);
  const alertFilters = { ...currentFilters, detailsFilters };
  const canAlert = hasSearchAlertCriteria(alertFilters);

  useEffect(() => {
    let cancelled = false;
    setEmailAlertId(null);
    if (!user) return;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const response = await fetch('/api/search-alerts', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return;
      const result = await response.json();
      if (!cancelled) setEmailAlertId(result.alerts?.find((alert: { search_url: string }) => alert.search_url === currentSearchUrl)?.id || null);
    })().catch(() => undefined);
    return () => { cancelled = true; };
  }, [user, currentSearchUrl]);

  const { ads, loading, loadingMore, hasMore, loadMore } = useAds({
    lat: userLocation?.lat,
    lng: userLocation?.lng,
    radius: radius
  });

  const filteredAds = useMemo(() => {
    // Helper to safely get value from Ad (checking root or details)
    const getAdValue = (ad: Ad, key: string) => {
      // Check root first (legacy/schema columns)
      const adRecord = ad as unknown as Record<string, unknown>;
      if (adRecord[key] !== undefined) return adRecord[key];
      // Check details (new JSONB) - assume ad might have details property despite type definition
      const details = adRecord.details as Record<string, unknown> | undefined;
      if (details && details[key] !== undefined) return details[key];
      return undefined;
    };

    const fieldTypeMap = new Map(getCategoryFields(selectedCategory, selectedSubcategory).map((f) => [f.name, f.type]));

    return ads.filter((ad) => {
      if (isLowQualityPublicAd(ad)) return false;
      // Category filter
      if (selectedCategory && ad.category !== selectedCategory) return false;

      // Subcategory filter
      if (selectedSubcategory && ad.subcategory !== selectedSubcategory) return false;

      // Transaction type filter (for real estate)
      if (selectedTransactionType && ad.transactionType !== selectedTransactionType) return false;

      // State filter
      if (selectedState && ad.location?.state !== selectedState) return false;

      // City filter
      if (selectedCity && ad.location?.city?.toLowerCase() !== selectedCity.toLowerCase()) return false;

      // Price filter
      if (ad.price < priceRange[0] || ad.price > priceRange[1]) return false;

      // Advertiser type filter
      if (advertiserType !== 'ambos') {
        const sellerType = String(
          (ad as any).seller?.type ??
          (ad as any).seller?.sellerType ??
          (ad as any).seller?.profileType ??
          ''
        ).toLowerCase();
        const isProfessional = sellerType.includes('profissional') || sellerType.includes('professional');

        if (advertiserType === 'profissional' && !isProfessional) return false;
        if (advertiserType === 'particular' && isProfessional) return false;
      }

      // Search filter
      if (searchQuery) {
        const normalize = (str: string) => 
          str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

        const query = normalize(searchQuery);
        const detailsString = (ad as any).details 
          ? Object.values((ad as any).details).join(' ') 
          : '';

        const searchTarget = [
          ad.title,
          ad.description,
          ad.category,
          ad.subcategory,
          ad.location?.city || '',
          ad.location?.state || '',
          (ad as any).location?.neighborhood || '', // Bairro
          detailsString
        ].map(s => normalize(s)).join(' | ');

        if (!searchTarget.includes(query)) return false;
      }

      // Dynamic Details Filter
      // Only apply if we have active filters
      if (Object.keys(detailsFilters).length > 0) {
        for (const [key, filterValue] of Object.entries(detailsFilters)) {
          if (!filterValue) continue; // Skip empty filters

          const minRangeMatch = key.match(/^(.*)Min$/);
          if (minRangeMatch) {
            const baseKey = minRangeMatch[1];
            const adValue = getAdValue(ad, baseKey);
            const minValue = Number(filterValue);
            const adNumberValue = Number(adValue);

            if (Number.isNaN(minValue)) continue;
            if (Number.isNaN(adNumberValue) || adNumberValue < minValue) return false;
            continue;
          }

          const maxRangeMatch = key.match(/^(.*)Max$/);
          if (maxRangeMatch) {
            const baseKey = maxRangeMatch[1];
            const adValue = getAdValue(ad, baseKey);
            const maxValue = Number(filterValue);
            const adNumberValue = Number(adValue);

            if (Number.isNaN(maxValue)) continue;
            if (Number.isNaN(adNumberValue) || adNumberValue > maxValue) return false;
            continue;
          }

          const adValue = getAdValue(ad, key);

          if (adValue === undefined || adValue === null) {
            return false;
          }

          if (typeof filterValue === 'boolean') {
            const boolValue =
              adValue === true ||
              adValue === 1 ||
              String(adValue).toLowerCase() === 'true' ||
              String(adValue).toLowerCase() === 'sim';
            if (!boolValue) return false;
            continue;
          }

          if (key === 'bedrooms' || key === 'bathrooms' || key === 'garage') {
            const adNumberValue = Number(adValue);
            if (Number.isNaN(adNumberValue)) return false;

            if (String(filterValue) === '5+') {
              if (adNumberValue < 5) return false;
            } else if (adNumberValue !== Number(filterValue)) {
              return false;
            }
            continue;
          }

          const fieldType = fieldTypeMap.get(key);
          if (fieldType === 'select') {
            if (String(adValue).toLowerCase() !== String(filterValue).toLowerCase()) return false;
            continue;
          }

          // Normalizing for comparison
          const sFilter = String(filterValue).toLowerCase();
          const sAdValue = String(adValue).toLowerCase();

          // Simple inclusion for flexibility
          if (!sAdValue.includes(sFilter)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [ads, selectedCategory, selectedSubcategory, selectedTransactionType, selectedState, selectedCity, advertiserType, priceRange, searchQuery, detailsFilters]);

  const sortedAds = [...filteredAds].sort((a, b) => {
    if (sortBy === 'menor-preco') return a.price - b.price;
    if (sortBy === 'maior-preco') return b.price - a.price;
    if (sortBy === 'recentes') return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();

    // relevancia: destaque primeiro, depois mais recentes
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  const saveCurrentSearch = () => {
    const next = saveSearch({
      url: withDetailsFiltersInUrl(window.location.pathname, window.location.search, detailsFilters),
      filters: {
        selectedCategory,
        selectedSubcategory,
        selectedTransactionType,
        selectedState,
        selectedCity,
        advertiserType,
        sortBy,
        priceRange,
        searchQuery,
        detailsFilters,
        radius,
      },
    });
    setSavedSearches(next);
    setShowSavedSearches(true);
    toast.success('Busca salva neste dispositivo.');
  };

  const deleteSavedSearch = (id: string) => {
    setSavedSearches(removeSavedSearch(id));
    toast.success('Busca removida.');
  };

  const toggleEmailAlert = async () => {
    if (!canAlert) return;
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(currentSearchUrl)}`);
      return;
    }
    setEmailAlertBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Entre novamente para gerenciar seus alertas.');
      const response = await fetch('/api/search-alerts', {
        method: emailAlertId ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(emailAlertId ? { id: emailAlertId } : {
          url: currentSearchUrl,
          label: buildSearchLabel({ filters: { ...currentFilters, sortBy, detailsFilters, radius } }),
          filters: alertFilters,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível atualizar o alerta.');
      setEmailAlertId(emailAlertId ? null : result.alert.id);
      toast.success(emailAlertId ? 'Alerta por e-mail desativado.' : 'Alerta por e-mail ativado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o alerta.');
    } finally {
      setEmailAlertBusy(false);
    }
  };

  const shareAd = async (event: MouseEvent, ad: Ad) => {
    event.preventDefault();
    event.stopPropagation();
    const url = `${window.location.origin}/anuncio/${ad.id}`;
    try {
      if (navigator.share) await navigator.share({ title: ad.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Link do anúncio copiado.');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link do anúncio copiado.');
      } catch {
        toast.error('Não foi possível compartilhar este anúncio.');
      }
    }
  };

  if (loading) {
    return (
      <div className={viewMode === 'grid' ? "grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4" : "flex flex-col gap-4"}>
        {[...Array(6)].map((_, i) => (
          <AdCardSkeleton key={i} />
        ))}
      </div>
    );
  }


  return (
    <div>
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-semibold text-gray-800">
          {filteredAds.length} {filteredAds.length === 1 ? 'anúncio encontrado' : 'anúncios encontrados'}
        </h2>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* View Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              title="Visualização em Grade"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              title="Visualização em Lista"
            >
              <ListIcon className="w-5 h-5" />
            </button>
          </div>
          <button
            type="button"
            onClick={toggleEmailAlert}
            disabled={!canAlert || emailAlertBusy}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${emailAlertId ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
            title={canAlert ? (emailAlertId ? 'Desativar alerta por e-mail' : 'Avisar por e-mail quando surgirem anúncios') : 'Aplique pelo menos um filtro específico para criar um alerta'}
          >
            {emailAlertId ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            <span className="hidden sm:inline">{emailAlertId ? 'Alerta ativo' : 'Avisar por e-mail'}</span>
          </button>
          <div className="relative group">
            <button
              type="button"
              onClick={saveCurrentSearch}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              title="Salvar esta busca neste dispositivo para acessar rápido depois"
            >
              <BookmarkPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Salvar busca</span>
            </button>
            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg text-center z-30">
              Salva esta busca neste dispositivo. Você pode reabrir os filtros depois.
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 -mt-1"></div>
            </div>

            {savedSearches.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSavedSearches((value) => !value)}
                className="ml-2 inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-2 text-xs font-bold text-blue-600 hover:bg-blue-50"
                title="Buscas salvas"
              >
                {savedSearches.length}
              </button>
            )}

            {showSavedSearches && savedSearches.length > 0 && (
              <div className="absolute right-0 top-12 z-20 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                <div className="px-2 py-2 text-xs font-semibold uppercase text-gray-500">Buscas salvas</div>
                <div className="max-h-72 overflow-auto">
                  {savedSearches.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50">
                      <Link
                        href={item.url}
                        className="min-w-0 flex-1"
                        onClick={() => setShowSavedSearches(false)}
                      >
                        <span className="block truncate text-sm font-medium text-gray-800">{item.label}</span>
                        <span className="block text-xs text-gray-500">{formatDate(item.createdAt)}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => deleteSavedSearch(item.id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Remover busca salva"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {sortedAds.length === 0 ? (
        <div className="border-y border-gray-200 bg-white px-5 py-10 text-center sm:px-8">
          <h2 className="text-lg font-semibold text-gray-900">Nenhum anúncio encontrado</h2>
          <p className="mt-2 text-sm text-gray-600">
            {searchQuery.trim() ? <>Não encontramos resultados para <strong>“{searchQuery.trim()}”</strong>. Tente outro termo ou veja categorias populares.</> : 'Tente remover alguns filtros ou explore estas categorias.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {['Imóveis', 'Autos e Peças', 'Eletrônicos e Celulares', 'Para a sua Casa'].map((category) => (
              <Link key={category} href={getCategoryPath(category)} className="rounded-full border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-700">
                {category}
              </Link>
            ))}
          </div>
          <button
            type="button"
            onClick={() => { setSearchQuery(''); router.push('/'); }}
            className="mt-5 min-h-11 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Limpar busca e filtros
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4" : "flex flex-col gap-4"}>
          {sortedAds.map((ad) => (
            <article
              key={ad.id}
              className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden group flex ${viewMode === 'grid' ? 'flex-col' : 'flex-row'}`}
            >
              {/* Image Container */}
              <div className={`relative bg-gray-100 overflow-hidden ${viewMode === 'grid' ? 'aspect-[4/3] w-full' : 'w-32 sm:w-48 md:w-64 shrink-0'}`}>
                <Link href={`/anuncio/${ad.id}`} className="absolute inset-0 z-0" aria-label={`Ver anúncio: ${ad.title}`}>
                  {ad.images[0] ? (
                    <img
                      src={ad.images[0]}
                      alt={ad.title}
                      className="w-full h-full object-contain bg-white p-1"
                      loading="lazy"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-gray-50">
                      <ImageIcon className="w-10 h-10 text-gray-300" />
                    </span>
                  )}
                </Link>
                <div className={`absolute top-2 right-2 z-10 flex flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 ${viewMode === 'grid' ? 'translate-x-0 md:translate-x-4 md:group-hover:translate-x-0' : ''}`}>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 shadow-lg transition-colors hover:bg-blue-50 hover:text-blue-600"
                    aria-label="Compartilhar anúncio"
                    title="Compartilhar anúncio"
                    onClick={(event) => shareAd(event, ad)}
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button
                    className="p-1.5 md:p-2 bg-white rounded-full shadow-lg hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors"
                    aria-label={favorites.has(ad.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    onClick={(e) => {
                      e.preventDefault(); // Prevent navigation
                      onToggleFavorite(ad.id);
                    }}
                  >
                    <Heart className={`w-4 h-4 ${favorites.has(ad.id) ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <Link href={`/anuncio/${ad.id}`} className="p-3 md:p-4 flex flex-col flex-1 justify-between">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] md:text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full truncate max-w-[70%]">
                      {ad.category}
                    </span>
                    <span className="text-[10px] md:text-xs text-gray-400 whitespace-nowrap ml-1">
                      {formatDate(ad.publishedAt)}
                    </span>
                  </div>
                  <h3 className="text-sm md:text-base font-semibold text-gray-800 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight">
                    {ad.title}
                  </h3>
                  <p className="text-base md:text-lg font-bold text-gray-900 mb-2">
                    {formatPrice(ad.price)}
                  </p>
                </div>

                {/* Location */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-gray-50 mt-auto text-xs text-gray-500">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">
                    {ad.location?.city || 'Brasil'}{ad.location?.state ? `, ${ad.location.state}` : ''}
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && sortedAds.length > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loadingMore ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Carregando...
              </span>
            ) : (
              'Carregar mais'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
