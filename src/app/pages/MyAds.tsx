import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Plus, ArrowLeft, Trash2, Edit, Star, CreditCard, QrCode, X } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Ad } from '../../types';
import { formatPrice } from '../../lib/formatters';
import { toast } from 'sonner';
import {
    createFeaturedPayment,
    FeaturedPayment,
    FeaturedPlan,
    FeaturedProvider,
    formatCents,
} from '../../lib/featuredPayments';

export default function MyAds() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [ads, setAds] = useState<Ad[]>([]);
    const [plans, setPlans] = useState<FeaturedPlan[]>([]);
    const [payments, setPayments] = useState<FeaturedPayment[]>([]);
    const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [provider, setProvider] = useState<FeaturedProvider>('stripe');
    const [creatingPayment, setCreatingPayment] = useState(false);
    const [pixResult, setPixResult] = useState<{ qrCode?: string; qrImageUrl?: string; expiresAt?: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMyAds() {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                // Since 'seller' is a JSONB column, we need to query it using the arrow operator
                // Note: This assumes the 'seller' object has an 'id' field matching user.id
                const { data, error } = await supabase
                    .from('ads')
                    .select('*')
                    .contains('seller', { id: user.id })
                    .order('publishedAt', { ascending: false });

                if (error) throw error;

                setAds(data || []);
            } catch (error) {
                console.error('Error fetching my ads:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchMyAds();
    }, [user]);

    useEffect(() => {
        if (!user) return;

        async function fetchFeaturedData() {
            const [{ data: plansData }, { data: paymentsData }] = await Promise.all([
                supabase
                    .from('featured_plans')
                    .select('*')
                    .eq('active', true)
                    .order('sort_order', { ascending: true }),
                supabase
                    .from('featured_payments')
                    .select('*, featured_plans(name, duration_days)')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false }),
            ]);

            const activePlans = (plansData || []) as FeaturedPlan[];
            setPlans(activePlans);
            setPayments((paymentsData || []) as FeaturedPayment[]);
            if (!selectedPlanId && activePlans[0]) {
                setSelectedPlanId(activePlans[0].id);
            }
        }

        fetchFeaturedData();
    }, [user, selectedPlanId]);

    useEffect(() => {
        const result = searchParams.get('featured');
        if (result === 'success') {
            toast.success('Pagamento iniciado. O destaque será ativado após a confirmação.');
            setSearchParams({}, { replace: true });
        }
        if (result === 'cancel') {
            toast.info('Pagamento cancelado.');
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault(); // Prevent navigation
        if (!confirm('Deseja realmente excluir este anúncio?')) return;

        try {
            const { error } = await supabase.from('ads').delete().eq('id', id);
            if (error) throw error;

            setAds(prev => prev.filter(ad => ad.id !== id));
            toast.success('Anúncio excluído com sucesso!');
        } catch (error) {
            console.error('Error deleting ad:', error);
            toast.error('Erro ao excluir anúncio.');
        }
    };

    const openFeaturedModal = (ad: Ad, e: React.MouseEvent) => {
        e.preventDefault();
        setSelectedAd(ad);
        setPixResult(null);
        if (!selectedPlanId && plans[0]) {
            setSelectedPlanId(plans[0].id);
        }
    };

    const handleCreatePayment = async () => {
        if (!selectedAd || !selectedPlanId) {
            toast.error('Escolha um plano de destaque.');
            return;
        }

        setCreatingPayment(true);
        try {
            const result = await createFeaturedPayment(selectedAd.id, selectedPlanId, provider);
            if (result.checkoutUrl) {
                window.location.href = result.checkoutUrl;
                return;
            }

            if (result.pix) {
                setPixResult(result.pix);
                toast.success('PIX gerado. O destaque será ativado após a confirmação do pagamento.');
            }

            const { data } = await supabase
                .from('featured_payments')
                .select('*, featured_plans(name, duration_days)')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });
            setPayments((data || []) as FeaturedPayment[]);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao criar pagamento.');
        } finally {
            setCreatingPayment(false);
        }
    };

    const getLatestPaymentForAd = (adId: string) => payments.find((payment) => payment.ad_id === adId);

    const getFeaturedStatus = (ad: Ad) => {
        const rawExpiresAt = (ad as Ad & { featured_expires_at?: string }).featured_expires_at || ad.featuredExpiresAt;
        if (!ad.featured) return null;
        if (!rawExpiresAt) return 'Destaque ativo';

        const expiresAt = new Date(rawExpiresAt);
        if (Number.isNaN(expiresAt.getTime())) return 'Destaque ativo';
        if (expiresAt < new Date()) return 'Destaque expirado';

        return `Destaque até ${expiresAt.toLocaleDateString('pt-BR')}`;
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
                <p className="text-gray-600 mb-4">Você precisa estar logado para ver seus anúncios.</p>
                <Link
                    to="/login"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    Ir para Login
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                <div>
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center text-gray-600 hover:text-blue-600 mb-2 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar para a Home
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">Meus Anúncios</h1>
                </div>
                <Link
                    to="/anunciar"
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Criar Novo Anúncio
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : ads.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-lg text-gray-600 mb-4">Você ainda não tem anúncios publicados.</p>
                    <Link
                        to="/anunciar"
                        className="text-blue-600 font-medium hover:underline"
                    >
                        Comece a vender agora!
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {ads.map((ad) => {
                        const latestPayment = getLatestPaymentForAd(ad.id);
                        const featuredStatus = getFeaturedStatus(ad);

                        return (
                        <Link to={`/anuncio/${ad.id}`} key={ad.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden group block">
                            {/* Image */}
                            <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                                <img
                                    src={ad.images[0]}
                                    alt={ad.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium text-gray-700 shadow-sm">
                                    {ad.category}
                                </div>
                                {featuredStatus && (
                                    <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-md text-xs font-bold shadow-sm flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-current" />
                                        Destaque
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <div className="mb-2">
                                    <h3 className="font-semibold text-gray-800 truncate" title={ad.title}>
                                        {ad.title}
                                    </h3>
                                    <p className="text-lg font-bold text-blue-600">
                                        {formatPrice(ad.price)}
                                    </p>
                                    {featuredStatus && (
                                        <p className="text-xs font-medium text-yellow-700 mt-1">{featuredStatus}</p>
                                    )}
                                    {latestPayment && !featuredStatus && (
                                        <p className={`text-xs mt-1 ${paymentStatusClass(latestPayment.status)}`}>
                                            {paymentStatusLabel(latestPayment)}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 gap-2">
                                    <span className="text-xs text-gray-500">
                                        {new Date(ad.publishedAt).toLocaleDateString('pt-BR')} -- {ad.views} visualizações
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => openFeaturedModal(ad, e)}
                                            className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-md transition-colors"
                                            title="Destacar anúncio"
                                        >
                                            <Star className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                navigate(`/editar/${ad.id}`);
                                            }}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                            title="Editar"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(ad.id, e)}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Link>
                        );
                    })}
                </div>
            )}
            {selectedAd && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 relative">
                        <button
                            onClick={() => setSelectedAd(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            title="Fechar"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Destacar anúncio</h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Escolha um plano para aumentar a visibilidade de "{selectedAd.title}".
                            </p>
                        </div>

                        {getLatestPaymentForAd(selectedAd.id) && (
                            <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                                <p className="text-sm font-semibold text-gray-800">Último pagamento</p>
                                <p className={`text-sm mt-1 ${paymentStatusClass(getLatestPaymentForAd(selectedAd.id)!.status)}`}>
                                    {paymentStatusLabel(getLatestPaymentForAd(selectedAd.id)!)}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                            {plans.map((plan) => (
                                <button
                                    key={plan.id}
                                    onClick={() => setSelectedPlanId(plan.id)}
                                    className={`text-left rounded-xl border p-4 transition-colors ${selectedPlanId === plan.id
                                        ? 'border-blue-600 bg-blue-50'
                                        : 'border-gray-200 hover:border-blue-300'
                                        }`}
                                >
                                    <p className="font-semibold text-gray-900">{plan.duration_days} dias</p>
                                    <p className="text-lg font-bold text-blue-600">{formatCents(plan.price_cents, plan.currency)}</p>
                                    <p className="text-xs text-gray-500">{plan.name}</p>
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button
                                onClick={() => setProvider('stripe')}
                                className={`flex items-center justify-center gap-2 rounded-xl border p-3 font-medium ${provider === 'stripe'
                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 text-gray-700'
                                    }`}
                            >
                                <CreditCard className="w-4 h-4" />
                                Stripe
                            </button>
                            <button
                                onClick={() => setProvider('pixgo')}
                                className={`flex items-center justify-center gap-2 rounded-xl border p-3 font-medium ${provider === 'pixgo'
                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 text-gray-700'
                                    }`}
                            >
                                <QrCode className="w-4 h-4" />
                                PIX PixGo
                            </button>
                        </div>

                        {pixResult && (
                            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
                                <p className="font-semibold text-green-800 mb-2">PIX gerado com sucesso</p>
                                {pixResult.qrImageUrl && (
                                    <img src={pixResult.qrImageUrl} alt="QR Code PIX" className="w-40 h-40 bg-white rounded-lg border mx-auto mb-3" />
                                )}
                                {pixResult.qrCode && (
                                    <textarea
                                        title="Código PIX copia e cola"
                                        readOnly
                                        value={pixResult.qrCode}
                                        className="w-full h-24 text-xs border border-green-200 rounded-lg p-2 bg-white"
                                    />
                                )}
                                <p className="text-xs text-green-700 mt-2">
                                    Após a confirmação do PixGo, o anúncio será destacado automaticamente.
                                </p>
                            </div>
                        )}

                        <button
                            onClick={handleCreatePayment}
                            disabled={creatingPayment || plans.length === 0}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
                        >
                            {creatingPayment && <Loader2 className="w-4 h-4 animate-spin" />}
                            {provider === 'stripe' ? 'Ir para pagamento Stripe' : 'Gerar PIX'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function paymentStatusLabel(payment: FeaturedPayment) {
    const providerName = payment.provider === 'stripe' ? 'Stripe' : 'PixGo';
    const labels = {
        pending: `Pagamento pendente via ${providerName}`,
        paid: payment.expires_at
            ? `Pago. Destaque até ${new Date(payment.expires_at).toLocaleDateString('pt-BR')}`
            : 'Pago. Destaque ativo',
        expired: `Pagamento expirado via ${providerName}`,
        refunded: `Pagamento estornado via ${providerName}`,
        failed: `Pagamento falhou via ${providerName}`,
    };
    return labels[payment.status];
}

function paymentStatusClass(status: FeaturedPayment['status']) {
    const classes = {
        pending: 'text-orange-600',
        paid: 'text-green-700',
        expired: 'text-gray-600',
        refunded: 'text-purple-700',
        failed: 'text-red-600',
    };
    return classes[status];
}
