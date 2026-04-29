import { Header } from '../components/Header';
import { useAds } from '../hooks/useAds';
import { useFavorites } from '../hooks/useFavorites';
import { Link } from 'react-router-dom';
import { Loader2, Heart, MapPin, Clock } from 'lucide-react';
import { formatPrice, formatDate } from '../../lib/formatters';

export default function MyFavorites() {
    const { ads, loading: adsLoading } = useAds();
    const { favorites, toggleFavorite, loading: favLoading } = useFavorites();

    const loading = adsLoading || favLoading;

    // Filter ads to only show favorites
    const favoriteAds = ads.filter(ad => favorites.has(ad.id));

    return (
        <div className="min-h-screen bg-gray-50">
            <Header
                hideLocationFilter={true} // Optional: hide location if not relevant here
            />

            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Heart className="w-6 h-6 text-red-500 fill-current" />
                    Meus Favoritos
                </h1>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : favoriteAds.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Heart className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Sem favoritos ainda</h2>
                        <p className="text-gray-500 mb-6">Explore os anúncios e salve seus favoritos para ver aqui.</p>
                        <Link to="/" className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                            Explorar Anúncios
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {favoriteAds.map(ad => (
                            <Link to={`/anuncio/${ad.id}`} key={ad.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden group flex flex-col">
                                <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                                    <img
                                        src={ad.images[0]}
                                        alt={ad.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <button
                                        className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-red-50 text-red-500 transition-colors z-10"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            toggleFavorite(ad.id);
                                        }}
                                        title="Remover dos favoritos"
                                    >
                                        <Heart className="w-4 h-4 fill-current" />
                                    </button>
                                </div>
                                <div className="p-4 flex flex-col flex-1">
                                    <div className="mb-2">
                                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                            {ad.category}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-semibold text-gray-800 mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                        {ad.title}
                                    </h3>
                                    <p className="text-lg font-bold text-gray-900 mb-3">
                                        {formatPrice(ad.price)}
                                    </p>
                                    <div className="mt-auto flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-50">
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {ad.location.city}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {/* Assuming Clock component from lucide */}
                                            {formatDate(ad.publishedAt)}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
