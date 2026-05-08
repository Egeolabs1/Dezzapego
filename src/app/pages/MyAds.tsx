import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { Loader2, Plus, Trash2, Edit, Star, CreditCard, QrCode, X, LayoutGrid, Clock, XCircle, CheckCircle } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Ad } from '../../types';
import { formatPrice } from '../../lib/formatters';
import { toast } from 'sonner';
import SEO from '../../components/SEO';
import {
    createFeaturedPayment,
    FeaturedPayment,
    FeaturedPlan,
    FeaturedProvider,
    formatCents,
} from '../../lib/featuredPayments';

type ContactInterest = {
    buyer_id: string;
    buyer_name: string | null;
    buyer_email: string | null;
    contacted_at: string;
};

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
    const [soldAd, setSoldAd] = useState<Ad | null>(null);
    const [contactInterests, setContactInterests] = useState<ContactInterest[]>([]);
    const [selectedBuyerId, setSelectedBuyerId] = useState('');
    const [loadingInterests, setLoadingInterests] = useState(false);
    const [completingSale, setCompletingSale] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userId = user?.id;
        async function fetchMyAds() {
            if (!userId) { setLoading(false); return; }
            try {
                const { data, error } = await supabase
                    .from('ads')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setAds(data || []);
            } catch (error) {
                console.error('Error fetching my ads:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchMyAds();
    }, [user?.id]);

    useEffect(() => {
        const userId = user?.id;
        if (!userId) return;
        async function fetchFeaturedData() {
            const [{ data: plansData }, { data: paymentsData }] = await Promise.all([
                supabase.from('featured_plans').select('*').eq('active', true).order('sort_order', { ascending: true }),
                supabase.from('featured_payments').select('*, featured_plans(name, duration_days)').eq('user_id', userId!).order('created_at', { ascending: false }),
            ]);
            const activePlans = (plansData || []) as FeaturedPlan[];
            setPlans(activePlans);
            setPayments((paymentsData || []) as FeaturedPayment[]);
            if (!selectedPlanId && activePlans[0]) setSelectedPlanId(activePlans[0].id);
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
        e.preventDefault();
        if (!confirm('Deseja realmente excluir este anúncio?')) return;
        try {
            const { error } = await supabase.from('ads').delete().eq('id', id);
            if (error) throw error;
            setAds(prev => prev.filter(ad => ad.id !== id));
            toast.success('Anúncio excluído com sucesso!');
        } catch (error) {
            toast.error('Erro ao excluir anúncio.');
        }
    };

    const openSoldModal = async (ad: Ad, e: React.MouseEvent) => {
        e.preventDefault();
        setSoldAd(ad);
        setContactInterests([]);
        setSelectedBuyerId('');
        setLoadingInterests(true);

        try {
            const { data, error } = await supabase.rpc('get_ad_contact_interests', {
                p_ad_id: ad.id,
            });

            if (error) throw error;
            const interests = (data || []) as ContactInterest[];
            setContactInterests(interests);
            setSelectedBuyerId(interests[0]?.buyer_id || '');
        } catch (error) {
            toast.error('Erro ao carregar compradores que entraram em contato.');
        } finally {
            setLoadingInterests(false);
        }
    };

    const completeSale = async () => {
        if (!soldAd || !selectedBuyerId) {
            toast.error('Escolha um comprador para concluir a transação.');
            return;
        }

        setCompletingSale(true);

        try {
            const { error } = await supabase.rpc('complete_ad_transaction', {
                p_ad_id: soldAd.id,
                p_buyer_id: selectedBuyerId,
            });

            if (error) throw error;

            setAds((prev) => prev.map((item) => item.id === soldAd.id ? { ...item, status: 'sold' } as Ad : item));
            setSoldAd(null);
            toast.success('Transação concluída. O comprador agora pode avaliar você.');
        } catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (/seller cannot be buyer/i.test(message)) {
                toast.error('Você não pode registrar venda para sua própria conta.');
            } else if (/buyer did not contact/i.test(message)) {
                toast.error('Esse comprador ainda não entrou em contato por este anúncio.');
            } else {
                toast.error('Erro ao concluir a transação.');
            }
        } finally {
            setCompletingSale(false);
        }
    };

    const openFeaturedModal = (ad: Ad, e: React.MouseEvent) => {
        e.preventDefault();
        setSelectedAd(ad);
        setPixResult(null);
        if (!selectedPlanId && plans[0]) setSelectedPlanId(plans[0].id);
    };

    const handleCreatePayment = async () => {
        if (!selectedAd || !selectedPlanId) { toast.error('Escolha um plano de destaque.'); return; }
        setCreatingPayment(true);
        try {
            const result = await createFeaturedPayment(selectedAd.id, selectedPlanId, provider);
            if (result.checkoutUrl) { window.location.href = result.checkoutUrl; return; }
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

    const getLatestPaymentForAd = (adId: string) => payments.find(p => p.ad_id === adId);

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
            <div className="min-h-screen bg-gray-50">
                <SEO title="Meus anúncios" description="Gerencie seus anúncios no Dezzapego." noIndex />
                <Header hideLocationFilter />
                <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
                    <p className="text-gray-600 mb-4 text-center">Você precisa estar logado para ver seus anúncios.</p>
                    <Link to="/login" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                        Ir para o login
                    </Link>
                </div>
            </div>
        );
    }

    const pendingCount = ads.filter(a => (a as any).status === 'pending').length;
    const rejectedCount = ads.filter(a => (a as any).status === 'rejected').length;

    return (
        <div className="min-h-screen bg-gray-50">
            <SEO title="Meus anúncios" description="Gerencie seus anúncios no Dezzapego." noIndex />
            <Header hideLocationFilter />

            <main className="container mx-auto px-4 py-8 max-w-7xl">
                <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
                    <div>
                        <p className="text-sm font-medium text-blue-700 mb-1">Área do anunciante</p>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                            <LayoutGrid className="w-8 h-8 text-blue-600 hidden sm:block" aria-hidden />
                            Meus anúncios
                        </h1>
                        <p className="text-gray-600 mt-2 max-w-xl">
                            Edite, exclua ou destaque seus anúncios. Alterações ficam disponíveis no site após salvar.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center justify-center px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                        >
                            Minha conta
                        </button>
                        <Link
                            to="/anunciar"
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold shadow-sm"
                        >
                            <Plus className="w-5 h-5" />
                            Criar anúncio
                        </Link>
                    </div>
                </header>

                {/* Status alerts */}
                {pendingCount > 0 && (
                    <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span><strong>{pendingCount} anúncio{pendingCount > 1 ? 's' : ''}</strong> aguardando análise da moderação. Eles ficarão visíveis após aprovação.</span>
                    </div>
                )}
                {rejectedCount > 0 && (
                    <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
                        <XCircle className="w-4 h-4 flex-shrink-0" />
                        <span><strong>{rejectedCount} anúncio{rejectedCount > 1 ? 's' : ''}</strong> foi rejeitado. Entre em contato com o suporte para mais informações.</span>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" aria-label="Carregando" />
                    </div>
                ) : ads.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
                        <p className="text-lg text-gray-600 mb-4">Você ainda não tem anúncios publicados.</p>
                        <Link to="/anunciar" className="text-blue-600 font-medium hover:underline">
                            Comece a vender agora!
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {ads.map((ad) => {
                            const latestPayment = getLatestPaymentForAd(ad.id);
                            const featuredStatus = getFeaturedStatus(ad);
                            const adStatus = (ad as any).status || 'active';

                            return (
                                <Link
                                    to={adStatus === 'active' ? `/anuncio/${ad.id}` : '#'}
                                    key={ad.id}
                                    className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border overflow-hidden group block ${
                                        adStatus === 'rejected' ? 'border-red-200 opacity-75' :
                                        adStatus === 'pending' ? 'border-amber-200' :
                                        'border-gray-100'
                                    }`}
                                    onClick={adStatus !== 'active' ? (e) => e.preventDefault() : undefined}
                                >
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
                                        {adStatus === 'pending' && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-amber-500/90 text-white text-center py-1 text-xs font-semibold">
                                                ⏳ Em análise — aguardando moderação
                                            </div>
                                        )}
                                        {adStatus === 'rejected' && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-red-600/90 text-white text-center py-1 text-xs font-semibold">
                                                ✕ Rejeitado pela moderação
                                            </div>
                                        )}
                                        {adStatus === 'sold' && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-emerald-600/90 text-white text-center py-1 text-xs font-semibold">
                                                Vendido
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
                                                {ad.views ?? 0} visualizações
                                            </span>
                                            <div className="flex gap-2">
                                                {adStatus === 'active' && (
                                                    <>
                                                        <button
                                                            onClick={(e) => openFeaturedModal(ad, e)}
                                                            className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-md transition-colors"
                                                            title="Destacar anúncio"
                                                        >
                                                            <Star className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => openSoldModal(ad, e)}
                                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                                            title="Marcar como vendido"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={(e) => { e.preventDefault(); navigate(`/editar/${ad.id}`); }}
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
            </main>

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

            {soldAd && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 relative">
                        <button
                            onClick={() => setSoldAd(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            title="Fechar"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-xl font-bold text-gray-900">Concluir transação</h2>
                        <p className="mt-1 text-sm text-gray-600">
                            Escolha o comprador que entrou em contato pelo anúncio "{soldAd.title}".
                        </p>

                        <div className="mt-5">
                            {loadingInterests ? (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Carregando compradores...
                                </div>
                            ) : contactInterests.length === 0 ? (
                                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                                    Nenhum comprador logado abriu contato por este anúncio ainda.
                                </div>
                            ) : (
                                <select
                                    value={selectedBuyerId}
                                    onChange={(event) => setSelectedBuyerId(event.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
                                    title="Selecionar comprador"
                                >
                                    {contactInterests.map((interest) => (
                                        <option key={interest.buyer_id} value={interest.buyer_id}>
                                            {interest.buyer_name || interest.buyer_email || 'Comprador'} - contato em {new Date(interest.contacted_at).toLocaleDateString('pt-BR')}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <button
                            onClick={completeSale}
                            disabled={completingSale || loadingInterests || contactInterests.length === 0}
                            className="mt-6 w-full flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl py-3 font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60"
                        >
                            {completingSale && <Loader2 className="w-4 h-4 animate-spin" />}
                            Confirmar venda
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
