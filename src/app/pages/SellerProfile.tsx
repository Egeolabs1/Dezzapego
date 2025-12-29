import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Calendar, MessageCircle, Package, ShieldCheck, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Ad, Profile } from '../../types';
import { formatPrice } from '../../lib/formatters';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import SEO from '../../components/SEO';

export default function SellerProfile() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [ads, setAds] = useState<Ad[]>([]);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId && userId !== 'null' && userId !== 'undefined') {
            fetchData(userId);
        } else {
            setLoading(false);
        }
    }, [userId]);

    const fetchData = async (id: string) => {
        try {
            setLoading(true);

            // 1. Fetch Profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();

            if (profileError) {
                console.error('Error fetching profile:', profileError);
            }
            if (profileData) {
                setProfile(profileData);
            }

            // 2. Fetch Ads
            // Note: 'status' column might not exist yet if migration hasn't run.
            // We should ideally wrap this, but for now assuming SQL fix will be applied.
            // If column doesn't exist, this query will fail.
            // To be safe against missing column in dev, we can omit status check if needed,
            // but for production it should be there. Keeping it as it's part of the fix.
            const { data: adsData, error: adsError } = await supabase
                .from('ads')
                .select('*')
                .eq('user_id', id)
                //.eq('status', 'active') // Temporarily commented out until DB update is confirmed by user
                .order('created_at', { ascending: false });

            if (adsError) throw adsError;

            if (adsData) {
                setAds(adsData);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen pt-24 container mx-auto px-4 text-center">
                <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-12">
                    <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Vendedor não encontrado</h2>
                    <p className="text-gray-500 mb-6">
                        O perfil que você procura não está disponível.
                    </p>
                    <Link to="/" className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                        Voltar para o início
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-12 bg-gray-50">
            <SEO
                title={`Perfil de ${profile.full_name || 'Vendedor'}`}
                description={`Confira os anúncios de ${profile.full_name || 'Vendedor'} no Dezzapego.`}
                image={profile.avatar_url || undefined}
            />
            <div className="container mx-auto px-4">
                {/* Profile Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                    <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-400"></div>
                    <div className="px-8 pb-8">
                        <div className="relative flex flex-col md:flex-row items-start md:items-end -mt-12 mb-6 gap-6">
                            <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg overflow-hidden">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt={profile.full_name || 'Avatar'} className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    <div className="w-full h-full bg-blue-100 rounded-full flex items-center justify-center text-3xl font-bold text-blue-600 uppercase">
                                        {(profile.full_name || '?').charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h1 className="text-3xl font-bold text-gray-900">{profile.full_name || 'Usuário'}</h1>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4" />
                                        <span>Membro desde {new Date(profile.created_at || new Date().toISOString()).getFullYear()}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Package className="w-4 h-4" />
                                        <span>{ads.length} {ads.length === 1 ? 'anúncio ativo' : 'anúncios ativos'}</span>
                                    </div>
                                    {profile.verified && (
                                        <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                            <ShieldCheck className="w-4 h-4" />
                                            <span className="font-semibold text-xs">Verificado</span>
                                        </div>
                                    )}
                                </div>
                                {profile.bio && (
                                    <p className="mt-3 text-gray-600 max-w-2xl">{profile.bio}</p>
                                )}
                            </div>
                            <div className="w-full md:w-auto">
                                {user ? (
                                    <button className="w-full md:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 shadow-md hover:shadow-lg">
                                        <MessageCircle className="w-5 h-5" />
                                        Conversar no WhatsApp
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md"
                                    >
                                        <User className="w-5 h-5" />
                                        Entre para ver contato
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Anúncios de {(profile.full_name || '').split(' ')[0]}</h2>

                            {ads.length === 0 ? (
                                <p className="text-gray-500 py-8 text-center italic">Este vendedor não possui anúncios ativos no momento.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {ads.map((ad) => (
                                        <Link key={ad.id} to={`/anuncio/${ad.id}`} className="block group">
                                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col">
                                                {/* Image */}
                                                <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                                                    <img
                                                        src={ad.images[0] || 'https://via.placeholder.com/400x300?text=Sem+Foto'}
                                                        alt={ad.title}
                                                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                                    />
                                                    <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg">
                                                        {ad.category}
                                                    </div>
                                                    {ad.featured && (
                                                        <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-lg shadow-sm">
                                                            Destaque
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="p-4 flex flex-col flex-1">
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                                            {ad.title}
                                                        </h3>
                                                    </div>

                                                    <p className="text-lg font-bold text-blue-600 mb-3">
                                                        {formatPrice(ad.price)}
                                                    </p>

                                                    <div className="mt-auto flex items-center gap-2 text-xs text-gray-400">
                                                        <MapPin className="w-3 h-3" />
                                                        <span className="truncate">{ad.location.city}, {ad.location.state}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
