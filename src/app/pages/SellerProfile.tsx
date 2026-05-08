import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Calendar, MessageCircle, Package, ShieldCheck, Star, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Ad, Profile } from '../../types';
import { formatPrice } from '../../lib/formatters';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import SEO from '../../components/SEO';

type SellerReview = {
    id: string;
    transaction_id: string | null;
    seller_id: string;
    reviewer_id: string;
    reviewer_name: string | null;
    rating: number;
    comment: string | null;
    created_at: string;
};

type SellerTransaction = {
    id: string;
    ad_id: string;
    seller_id: string;
    buyer_id: string;
    status: 'completed' | 'canceled';
};

export default function SellerProfile() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { user, profile: currentProfile } = useAuth();
    const [ads, setAds] = useState<Ad[]>([]);
    const [profile, setProfile] = useState<Partial<Profile> | null>(null);
    const [reviews, setReviews] = useState<SellerReview[]>([]);
    const [eligibleTransaction, setEligibleTransaction] = useState<SellerTransaction | null>(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId && userId !== 'null' && userId !== 'undefined') {
            fetchData(userId);
        } else {
            setLoading(false);
        }
    }, [userId, user?.id]);

    const fetchData = async (id: string) => {
        try {
            setLoading(true);

            // 1. Fetch Profile
            const { data: publicProfiles, error: profileError } = await supabase.rpc('get_public_profiles', {
                p_ids: [id],
            });
            const profileData = publicProfiles?.[0];

            if (profileError) {
                console.error('Error fetching profile:', profileError);
            }
            if (profileData) {
                setProfile(profileData);
            }

            // 2. Fetch Ads
            const { data: adsData, error: adsError } = await supabase
                .from('ads')
                .select('*')
                .eq('user_id', id)
                .order('created_at', { ascending: false });

            if (adsError) throw adsError;

            if (adsData) {
                setAds(adsData);
            }

            const { data: reviewsData, error: reviewsError } = await supabase
                .from('seller_reviews')
                .select('id, transaction_id, seller_id, reviewer_id, reviewer_name, rating, comment, created_at')
                .eq('seller_id', id)
                .order('created_at', { ascending: false });

            if (reviewsError) {
                console.error('Error fetching reviews:', reviewsError);
            } else {
                const nextReviews = (reviewsData || []) as SellerReview[];
                setReviews(nextReviews);
                const ownReview = nextReviews.find((review) => review.reviewer_id === user?.id);
                if (ownReview) {
                    setReviewRating(ownReview.rating);
                    setReviewComment(ownReview.comment || '');
                }
            }

            if (user?.id && user.id !== id) {
                const { data: transactionsData, error: transactionsError } = await supabase
                    .from('seller_transactions')
                    .select('id, ad_id, seller_id, buyer_id, status')
                    .eq('seller_id', id)
                    .eq('buyer_id', user.id)
                    .eq('status', 'completed')
                    .order('completed_at', { ascending: false })
                    .limit(1);

                if (transactionsError) {
                    console.error('Error fetching seller transaction:', transactionsError);
                } else {
                    setEligibleTransaction((transactionsData?.[0] || null) as SellerTransaction | null);
                }
            } else {
                setEligibleTransaction(null);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const submitReview = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user || !userId || user.id === userId) return;
        if (!eligibleTransaction) return;

        setSubmittingReview(true);
        try {
            const { error } = await supabase
                .from('seller_reviews')
                .upsert({
                    transaction_id: eligibleTransaction.id,
                    seller_id: userId,
                    reviewer_id: user.id,
                    reviewer_name: currentProfile?.full_name || user.email || 'Usuário',
                    rating: reviewRating,
                    comment: reviewComment.trim() || null,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'seller_id,reviewer_id' });

            if (error) throw error;
            await fetchData(userId);
        } catch (error) {
            console.error('Error submitting review:', error);
        } finally {
            setSubmittingReview(false);
        }
    };

    const averageRating = reviews.length
        ? reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length
        : Number(profile?.rating || 0);

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
        <div className="min-h-screen bg-gray-50">
            <SEO
                title={`Perfil de ${profile.full_name || 'Vendedor'}`}
                description={`Confira os anúncios de ${profile.full_name || 'Vendedor'} no Dezzapego.`}
                image={profile.avatar_url || undefined}
            />
            <Header />
            <main className="pt-24 pb-12">
                <div className="container mx-auto px-4">
                    {/* Profile Header */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                        <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-400"></div>
                        <div className="px-8 pb-8">
                            {/* Fixed Layout: Name and details below banner, only avatar overlaps */}
                            <div className="relative flex flex-col md:flex-row items-start md:items-center mb-6 gap-6 pt-4">
                                <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg overflow-hidden -mt-16 shrink-0 relative z-10">
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
                                        <div className="flex items-center gap-1.5">
                                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                            <span>{averageRating > 0 ? averageRating.toFixed(1).replace('.', ',') : 'Sem avaliações'}{reviews.length > 0 ? ` (${reviews.length})` : ''}</span>
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
                                    {user && ads[0] ? (
                                        <Link
                                            to={`/anuncio/${ads[0].id}`}
                                            className="w-full md:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 shadow-md hover:shadow-lg"
                                        >
                                            <MessageCircle className="w-5 h-5" />
                                            Abrir anúncio para contato
                                        </Link>
                                    ) : user ? (
                                        <button
                                            disabled
                                            className="w-full md:w-auto flex items-center justify-center gap-2 bg-gray-200 text-gray-500 px-6 py-3 rounded-xl font-bold cursor-not-allowed"
                                        >
                                            <MessageCircle className="w-5 h-5" />
                                            Sem anúncio ativo
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

                            <div className="border-t border-gray-100 pt-6 mb-6">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                                    <h2 className="text-lg font-bold text-gray-900">Avaliações do anunciante</h2>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                        <span className="font-semibold">
                                            {averageRating > 0 ? `${averageRating.toFixed(1).replace('.', ',')} de 5` : 'Ainda sem avaliações'}
                                        </span>
                                    </div>
                                </div>

                                {user && user.id !== userId && eligibleTransaction && (
                                    <form onSubmit={submitReview} className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
                                        <label className="block text-sm font-semibold text-gray-800 mb-2">Sua avaliação</label>
                                        <div className="flex items-center gap-1 mb-3">
                                            {[1, 2, 3, 4, 5].map((value) => (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    onClick={() => setReviewRating(value)}
                                                    className="p-1 text-yellow-400"
                                                    aria-label={`Avaliar com ${value} estrela${value === 1 ? '' : 's'}`}
                                                >
                                                    <Star className={`w-6 h-6 ${value <= reviewRating ? 'fill-yellow-400' : 'fill-transparent'}`} />
                                                </button>
                                            ))}
                                        </div>
                                        <textarea
                                            value={reviewComment}
                                            onChange={(event) => setReviewComment(event.target.value)}
                                            maxLength={500}
                                            rows={3}
                                            placeholder="Conte como foi sua experiência com este anunciante."
                                            className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                                        />
                                        <div className="mt-3 flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={submittingReview}
                                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                                            >
                                                {submittingReview ? 'Salvando...' : 'Salvar avaliação'}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {user && user.id !== userId && !eligibleTransaction && (
                                    <div className="mb-6 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                                        Você só pode avaliar este anunciante depois que ele registrar uma transação concluída com você.
                                    </div>
                                )}

                                {reviews.length === 0 ? (
                                    <p className="text-sm text-gray-500">Este anunciante ainda não recebeu avaliações.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {reviews.slice(0, 6).map((review) => (
                                            <div key={review.id} className="rounded-xl border border-gray-100 bg-white p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{review.reviewer_name || 'Usuário'}</p>
                                                        <div className="mt-1 flex items-center gap-1">
                                                            {[1, 2, 3, 4, 5].map((value) => (
                                                                <Star
                                                                    key={value}
                                                                    className={`w-4 h-4 ${value <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-gray-400">
                                                        {new Date(review.created_at).toLocaleDateString('pt-BR')}
                                                    </span>
                                                </div>
                                                {review.comment && (
                                                    <p className="mt-3 text-sm text-gray-600">{review.comment}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
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
            </main>
        </div>
    );
}
