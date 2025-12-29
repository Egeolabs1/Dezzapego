import { Heart, MapPin, Clock, Eye, Star, LayoutGrid, List as ListIcon, Loader2 } from 'lucide-react';
import type { Ad } from '../../types';
import { useMemo, useState } from 'react';
import { formatPrice, formatDate } from '../../lib/formatters';
import { useAds } from '../hooks/useAds';
import { Link } from 'react-router-dom';

type AdsListProps = {
  selectedCategory: string;
  selectedSubcategory: string;
  selectedTransactionType?: 'venda' | 'aluguel' | '';
  selectedState: string;
  selectedCity?: string;
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
  priceRange,
  searchQuery,
  onAdClick,
  favorites,
  onToggleFavorite,
  detailsFilters = {},
  radius,
  userLocation
}: AdsListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { ads, loading } = useAds({
    lat: userLocation?.lat,
    lng: userLocation?.lng,
    radius: radius
  });

  const filteredAds = useMemo(() => {
    // Helper to safely get value from Ad (checking root or details)
    const getAdValue = (ad: Ad, key: string) => {
      // Check root first (legacy/schema columns)
      if ((ad as any)[key] !== undefined) return (ad as any)[key];
      // Check details (new JSONB) - assume ad might have details property despite type definition
      if ((ad as any).details && (ad as any).details[key] !== undefined) return (ad as any).details[key];
      return undefined;
    };

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

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          ad.title.toLowerCase().includes(query) ||
          ad.description.toLowerCase().includes(query)
        );
      }

      // Dynamic Details Filter
      // Only apply if we have active filters
      if (Object.keys(detailsFilters).length > 0) {
        for (const [key, filterValue] of Object.entries(detailsFilters)) {
          if (!filterValue) continue; // Skip empty filters

          const adValue = getAdValue(ad, key);

          if (adValue === undefined || adValue === null) {
            return false;
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
  }, [ads, selectedCategory, selectedSubcategory, selectedTransactionType, selectedState, selectedCity, priceRange, searchQuery, detailsFilters]);

  // Sort: featured first, then by date
  const sortedAds = [...filteredAds].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

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

          <select
            aria-label="Ordenar anúncios"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white flex-1 sm:flex-none"
          >
            <option>Mais recentes</option>
            <option>Menor preço</option>
            <option>Maior preço</option>
            <option>Mais vistos</option>
          </select>
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
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
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