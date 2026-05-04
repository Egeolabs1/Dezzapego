import { BookmarkPlus, Heart, LayoutGrid, List as ListIcon, Loader2, Trash2 } from 'lucide-react';
import type { Ad } from '../../types';
import { useMemo, useState } from 'react';
import { formatPrice, formatDate } from '../../lib/formatters';
import { useAds } from '../hooks/useAds';
import { Link } from 'react-router-dom';
import { getCategoryFields } from '../data/categorySpecs';
import { toast } from 'sonner';
import { readSavedSearches, removeSavedSearch, saveSearch, withDetailsFiltersInUrl, type SavedSearch } from '../../lib/marketplaceQuality';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => readSavedSearches());
  const [showSavedSearches, setShowSavedSearches] = useState(false);

  const { ads, loading } = useAds({
    lat: userLocation?.lat,
    lng: userLocation?.lng,
    radius: radius
  });

  console.log('[AdsList] Ads fetched:', ads.length, 'Loading:', loading);

  const filteredAds = useMemo(() => {
    // Helper to safely get value from Ad (checking root or details)
    const getAdValue = (ad: Ad, key: string) => {
      // Check root first (legacy/schema columns)
      if ((ad as any)[key] !== undefined) return (ad as any)[key];
      // Check details (new JSONB) - assume ad might have details property despite type definition
      if ((ad as any).details && (ad as any).details[key] !== undefined) return (ad as any).details[key];
      return undefined;
    };

    const fieldTypeMap = new Map(getCategoryFields(selectedCategory, selectedSubcategory).map((f) => [f.name, f.type]));

    return ads.filter((ad) => {
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
          <div className="relative">
            <button
              type="button"
              onClick={saveCurrentSearch}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              title="Salvar busca"
            >
              <BookmarkPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Salvar busca</span>
            </button>

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
                        to={item.url}
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
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 mb-2">Nenhum anúncio encontrado</p>
          <p className="text-sm text-gray-400">Tente ajustar seus filtros de busca</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4" : "flex flex-col gap-4"}>
          {sortedAds.map((ad) => (
            <Link
              to={`/anuncio/${ad.id}`}
              key={ad.id}
              className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden group flex ${viewMode === 'grid' ? 'flex-col' : 'flex-row'}`}
            >
              {/* Image Container */}
              <div className={`relative bg-gray-100 overflow-hidden ${viewMode === 'grid' ? 'aspect-[4/3] w-full' : 'w-32 sm:w-48 md:w-64 shrink-0'}`}>
                <img
                  src={ad.images[0]}
                  alt={ad.title}
                  className="w-full h-full object-contain bg-white p-1"
                  loading="lazy"
                />
                <div className={`absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${viewMode === 'grid' ? 'translate-x-4 group-hover:translate-x-0' : ''}`}>
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
                <div className="absolute bottom-2 left-2 right-2">
                  <span className="px-1.5 py-0.5 md:px-2 md:py-1 bg-black/50 backdrop-blur-sm text-white text-[10px] md:text-xs font-medium rounded-md truncate block w-fit max-w-full">
                    {ad.location?.city || 'Brasil'}, {ad.location?.state || 'BR'}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-3 md:p-4 flex flex-col flex-1 justify-between">
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

                {/* Seller - Live Data Display */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-50 mt-auto">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 shrink-0">
                    {ad.seller?.avatar_url ? (
                      <img src={ad.seller.avatar_url} alt={ad.seller.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400">{(ad.seller?.name || '?').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 truncate">
                    {ad.seller?.name?.split(' ')[0]}
                  </span>
                  {ad.seller?.verified && (
                    <span className="bg-blue-100 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-auto" title="Verificado">
                      ✔
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
