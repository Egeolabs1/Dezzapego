import { Heart, MapPin, Clock, Eye, Star } from 'lucide-react';
import type { Ad } from '../../types';
import { useMemo } from 'react';
import { formatPrice, formatDate } from '../../lib/formatters';
import { useAds } from '../hooks/useAds';
import { Loader2 } from 'lucide-react';
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
}: AdsListProps) {
  const { ads, loading } = useAds();

  const filteredAds = useMemo(() => {
    return ads.filter((ad) => {
      // Category filter
      if (selectedCategory && ad.category !== selectedCategory) return false;

      // Subcategory filter
      if (selectedSubcategory && ad.subcategory !== selectedSubcategory) return false;

      // Transaction type filter (for real estate)
      if (selectedTransactionType && ad.transactionType !== selectedTransactionType) return false;

      // State filter
      if (selectedState && ad.location.state !== selectedState) return false;

      // City filter
      if (selectedCity && ad.location.city.toLowerCase() !== selectedCity.toLowerCase()) return false;

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

      return true;
    });
  }, [ads, selectedCategory, selectedSubcategory, selectedTransactionType, selectedState, selectedCity, priceRange, searchQuery]);

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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl">
          {filteredAds.length} {filteredAds.length === 1 ? 'anúncio encontrado' : 'anúncios encontrados'}
        </h2>
        <select
          aria-label="Ordenar anúncios"
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option>Mais recentes</option>
          <option>Menor preço</option>
          <option>Maior preço</option>
          <option>Mais vistos</option>
        </select>
      </div>

      {sortedAds.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 mb-2">Nenhum anúncio encontrado</p>
          <p className="text-sm text-gray-400">Tente ajustar seus filtros de busca</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
          {sortedAds.map((ad) => (
            <Link to={`/anuncio/${ad.id}`} key={ad.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden group flex flex-col">
              {/* Image Container */}
              <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                <img
                  src={ad.images[0]}
                  alt={ad.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-4 group-hover:translate-x-0">
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
                    {ad.location.city}, {ad.location.state}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-3 md:p-4 flex flex-col flex-1">
                <div className="mb-1 md:mb-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] md:text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full truncate max-w-[70%]">
                      {ad.category}
                    </span>
                    <span className="text-[10px] md:text-xs text-gray-400 whitespace-nowrap ml-1">
                      {formatDate(ad.publishedAt)}
                    </span>
                  </div>
                  <h3 className="text-sm md:text-base font-semibold text-gray-800 mb-1 line-clamp-2 md:line-clamp-1 group-hover:text-blue-600 transition-colors h-10 md:h-auto leading-tight">
                    {ad.title}
                  </h3>
                  <p className="text-base md:text-lg font-bold text-gray-900">
                    {formatPrice(ad.price)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}