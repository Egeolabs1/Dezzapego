import { useEffect, useState, FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    Loader2, MapPin, Calendar, Share2, MessageCircle,
    Flag, X, AlertTriangle, ShieldCheck, ChevronRight, Heart, User, Trash2, Pencil, ChevronLeft
} from 'lucide-react';
import { Ad, Profile } from '../../types';
import { formatPrice } from '../../lib/formatters';
import { toast } from 'sonner';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../../components/SEO';
import { toAbsoluteUrl } from '../../lib/seo';
import { buildAdDetailStructuredGraph, getKeywordsForAd } from '../../lib/categorySeo';
import { incrementAdViewOnce } from '../../lib/adViews';

export default function AdDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [ad, setAd] = useState<Ad | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [showImageFullscreen, setShowImageFullscreen] = useState(false);

    // Report Modal State
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportDescription, setReportDescription] = useState('');
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    const [profile, setProfile] = useState<Profile | null>(null); // NEW

    useEffect(() => {
        async function fetchAd() {
            if (!id) return;
            try {
                // 1. Fetch Ad
                const { data: adData, error: adError } = await supabase
                    .from('ads')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (adError) throw adError;
                setAd(adData);

                // Conta visualização real (1x por sessão/aba) e atualiza UI
                const nextViews = await incrementAdViewOnce(adData.id);
                if (nextViews !== null) {
                    setAd((prev) => (prev ? { ...prev, views: nextViews } : prev));
                }

                // 2. Fetch Profile (Live Data)
                if (adData && adData.user_id) {
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', adData.user_id)
                        .single();

                    if (profileData) {
                        setProfile(profileData);
                    }
                }

            } catch (error) {
                console.error('Error fetching ad:', error);
                toast.error('Erro ao carregar anúncio.');
                navigate('/');
            } finally {
                setLoading(false);
            }
        }
        fetchAd();
    }, [id, navigate]);

    const handleContact = () => {
        if (!ad) return;
        if (!user) {
            toast.error('Faça login para contatar o vendedor.');
            navigate('/login');
            return;
        }

        const message = `Olá, vim pelo Dezzapego! Tenho interesse no seu anúncio "${ad.title}". Ainda está disponível?`;
        const encodedMessage = encodeURIComponent(message);
        const phone = ad.seller.phone.replace(/\D/g, '');

        window.open(`https://wa.me/55${phone}?text=${encodedMessage}`, '_blank');
    };

    const handleShare = async () => {
        try {
            await navigator.share({
                title: ad?.title,
                text: `Confira este anúncio no Dezzapego: ${ad?.title}`,
                url: window.location.href,
            });
        } catch (error) {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Link copiado!');
        }
    };

    const goToPrevImage = () => {
        setActiveImageIndex((prev) => (prev - 1 + ad!.images.length) % ad!.images.length);
    };

    const goToNextImage = () => {
        setActiveImageIndex((prev) => (prev + 1) % ad!.images.length);
    };

    const handleReportSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!ad || !reportReason) return;

        setIsSubmittingReport(true);
        try {
            const { error } = await supabase.from('reports').insert({
                ad_id: ad.id,
                reason: reportReason,
                description: reportDescription
            });

            if (error) throw error;

            toast.success('Denúncia enviada.');
            setShowReportModal(false);
            setReportReason('');
            setReportDescription('');
        } catch (error) {
            console.error('Error reporting ad:', error);
            // Fallback for demo if table doesn't exist yet
            toast.success('Denúncia recebida (Simulação Demo).');
            setShowReportModal(false);
        } finally {
            setIsSubmittingReport(false);
        }
    };

    const handleDelete = async () => {
        if (!ad || !user) return;

        if (!window.confirm('Tem certeza que deseja excluir este anúncio? Esta ação não pode ser desfeita.')) {
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('ads')
                .delete()
                .eq('id', ad.id)
                .eq('user_id', user.id); // Security: ensure query matches owner

            if (error) throw error;

            toast.success('Anúncio excluído com sucesso.');
            navigate('/');
        } catch (error) {
            console.error('Error deleting ad:', error);
            toast.error('Erro ao excluir anúncio.');
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-80px)]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!ad) return null;

    const adPageUrl = toAbsoluteUrl(id ? `/anuncio/${id}` : '/');
    const sellerDisplayName = profile?.full_name || ad.seller.name;
    const structuredGraph = buildAdDetailStructuredGraph(ad, adPageUrl, sellerDisplayName);

    return (
        <div className="bg-gray-50 min-h-screen pb-12">
            <SEO
                title={ad.title}
                description={`${formatPrice(ad.price)} — ${(ad.description ?? '').slice(0, 155)}`}
                image={ad.images[0]}
                url={adPageUrl}
                type="product"
                keywords={getKeywordsForAd(ad)}
                structuredData={structuredGraph}
            />
            <Header />

            {/* Breadcrumb Navigation */}
            <div className="bg-white border-b border-gray-200">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-gray-500 overflow-x-auto whitespace-nowrap">
                        <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
                        <ChevronRight className="w-4 h-4 flex-shrink-0" />
                        <span className="hover:text-blue-600 cursor-pointer">{ad.category}</span>
                        {ad.subcategory && (
                            <>
                                <ChevronRight className="w-4 h-4 flex-shrink-0" />
                                <span className="hover:text-blue-600 cursor-pointer">{ad.subcategory}</span>
                            </>
                        )}
                        <ChevronRight className="w-4 h-4 flex-shrink-0" />
                        <span className="font-medium text-gray-900 truncate">{ad.title}</span>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* Main Content (Left Column) */}
                    <div className="md:col-span-2 space-y-6">

                        {/* Title Section */}
                        <div className="mb-2">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-2">{ad.title}</h1>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-bold text-xs uppercase tracking-wide border border-blue-200">
                                    {ad.transactionType || 'Venda'}
                                </span>
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>{new Date(ad.publishedAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    <span>{ad.location.city}, {ad.location.state}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">#{ad.id.slice(0, 6)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Image Gallery */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="aspect-[4/3] bg-gray-100 relative group">
                                <img
                                    src={ad.images[activeImageIndex]}
                                    alt={ad.title}
                                    className="w-full h-full object-contain bg-white cursor-zoom-in"
                                    loading="lazy"
                                    onClick={() => setShowImageFullscreen(true)}
                                />
                                {ad.featured && (
                                    <div className="absolute top-4 left-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide shadow-sm">
                                        Destaque
                                    </div>
                                )}
                            </div>

                            {/* Thumbnails */}
                            {ad.images.length > 1 && (
                                <div className="p-4 border-t border-gray-100 bg-white">
                                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                                        {ad.images.map((img, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveImageIndex(idx)}
                                                className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${activeImageIndex === idx
                                                    ? 'border-blue-600 ring-2 ring-blue-100'
                                                    : 'border-transparent hover:border-gray-300 opacity-70 hover:opacity-100'
                                                    }`}
                                            >
                                                <img src={img} alt={`View ${idx}`} className="w-full h-full object-contain bg-white" loading="lazy" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Description Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-700 p-2 rounded-lg">
                                    <MessageCircle className="w-5 h-5" />
                                </span>
                                Descrição do Anúncio
                            </h2>
                            <div className="prose prose-blue max-w-none">
                                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-base">
                                    {ad.description}
                                </p>
                            </div>

                            <hr className="my-6 border-gray-100" />

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="block text-gray-400 mb-1">Publicado em</span>
                                    <span className="font-medium text-gray-900">{new Date(ad.publishedAt).toLocaleDateString()}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-400 mb-1">Localização</span>
                                    <span className="font-medium text-gray-900">{ad.location.city}, {ad.location.state}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-400 mb-1">Categoria</span>
                                    <span className="font-medium text-gray-900">{ad.category}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-400 mb-1">Código</span>
                                    <span className="font-medium text-gray-900 font-mono">#{ad.id.slice(0, 6)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Location Map (Only for Imóveis) */}
                    {['Imóveis', 'Terrenos', 'Sítios', 'Fazendas'].includes(ad.category) && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-700 p-2 rounded-lg">
                                    <MapPin className="w-5 h-5" />
                                </span>
                                Localização Aproximada
                            </h2>
                            <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-100">
                                <iframe
                                    title="Localização do Imóvel"
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    scrolling="no"
                                    marginHeight={0}
                                    marginWidth={0}
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(`${ad.location.city}, ${ad.location.state}`)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                                ></iframe>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 text-center">
                                * A localização no mapa é aproximada (apenas cidade/estado) para segurança do vendedor.
                            </p>
                        </div>
                    )}

                    {/* Sidebar (Right Column) */}
                    <div className="md:col-span-1 space-y-6">
                        {/* Price & Title Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
                            <div className="mb-6">
                                {/* Price Section */}
                                <div className="flex items-center gap-3">
                                    <p className="text-3xl font-bold text-blue-600 tracking-tight">{formatPrice(ad.price)}</p>
                                    {(ad.condominium || ad.iptu) && (
                                        <div className="flex flex-col text-sm text-gray-500 mt-1">
                                            {ad.condominium && (
                                                <span>Condomínio: <b className="text-gray-700">{formatPrice(ad.condominium)}</b></span>
                                            )}
                                            {ad.iptu && (
                                                <span>IPTU: <b className="text-gray-700">{formatPrice(ad.iptu)}</b></span>
                                            )}
                                        </div>
                                    )}
                                    {ad.transactionType && (
                                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${ad.transactionType === 'venda'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-purple-100 text-purple-700'
                                            }`}>
                                            {ad.transactionType}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Owner Controls */}
                            {user && user.id === ad.user_id && (
                                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <p className="text-sm font-semibold text-gray-700 mb-3">Gerenciar Anúncio</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => navigate(`/editar-anuncio/${ad.id}`)}
                                            className="flex items-center justify-center gap-2 py-2 px-4 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-blue-600 font-medium transition-colors"
                                        >
                                            <Pencil className="w-4 h-4" />
                                            Editar
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            className="flex items-center justify-center gap-2 py-2 px-4 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 font-medium transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Excluir
                                        </button>
                                    </div>
                                </div>
                            )}

                            {user ? (
                                <button
                                    onClick={handleContact}
                                    className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-green-200 mb-3"
                                >
                                    <MessageCircle className="w-6 h-6" />
                                    Chamar no WhatsApp
                                </button>
                            ) : (
                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all mb-3"
                                >
                                    <User className="w-6 h-6" />
                                    Entre para ver o Telefone
                                </button>
                            )}

                            <div className="flex gap-2">
                                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 font-medium transition-colors">
                                    <Heart className="w-5 h-5" />
                                    Salvar
                                </button>
                                <button
                                    onClick={handleShare}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 font-medium transition-colors"
                                >
                                    <Share2 className="w-5 h-5" />
                                    Compartilhar
                                </button>
                            </div>

                            {/* Seller Info */}
                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <Link to={`/anunciante/${ad.user_id}`} className="flex items-center gap-4 mb-4 hover:bg-gray-50 p-2 rounded-lg transition-colors group">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg group-hover:bg-blue-200 transition-colors overflow-hidden">
                                        {profile?.avatar_url ? (
                                            <img
                                                src={profile.avatar_url}
                                                alt={profile.full_name || ad.seller?.name}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            (profile?.full_name || ad.seller?.name || '?').charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Vendido por</p>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
                                                {profile?.full_name || ad.seller?.name}
                                            </p>
                                            {/* Type is not currently in Profile, fallback to snapshot or assume default */}
                                            {ad.seller?.type === 'professional' && (
                                                <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-blue-200 uppercase tracking-wide">
                                                    PRO
                                                </span>
                                            )}
                                            {(profile?.verified || ad.seller?.verified) && (
                                                <span className="text-blue-600" title="Vendedor Verificado">
                                                    <ShieldCheck className="w-5 h-5 fill-blue-100" />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                                    <Calendar className="w-4 h-4" />
                                    <span>
                                        No Dezzapego desde {new Date(profile?.created_at || ad.seller?.memberSince || new Date().toISOString()).getFullYear()}
                                    </span>
                                </div>
                            </div>

                            {/* Safety Tips */}
                            <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-100 text-xs text-blue-900">
                                <div className="flex items-start gap-2">
                                    <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-bold text-blue-900 mb-1">Dicas de Segurança</h3>
                                        <ul className="list-disc list-inside space-y-0.5 text-blue-800">
                                            <li>Não faça pagamentos antecipados.</li>
                                            <li>Prefira locais públicos.</li>
                                            <li>Verifique o produto pessoalmente.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 text-center">
                                <button
                                    onClick={() => setShowReportModal(true)}
                                    className="text-xs text-gray-400 hover:text-red-500 flex items-center justify-center gap-1 mx-auto transition-colors"
                                >
                                    <Flag className="w-3 h-3" />
                                    Denunciar anúncio
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3 text-red-600">
                                <div className="bg-red-50 p-2 rounded-lg">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Denunciar Anúncio</h3>
                            </div>
                            <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors" aria-label="Fechar">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleReportSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="reportReason" className="block text-sm font-semibold text-gray-700 mb-2">Qual o motivo da denúncia?</label>
                                <select
                                    id="reportReason"
                                    required
                                    value={reportReason}
                                    onChange={e => setReportReason(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                                >
                                    <option value="">Selecione um motivo...</option>
                                    <option value="Fraude">Tentativa de Fraude / Golpe</option>
                                    <option value="Produto Proibido">Produto Proibido</option>
                                    <option value="Conteudo Ofensivo">Conteúdo Ofensivo ou Impróprio</option>
                                    <option value="Preco Irreal">Preço Irreal / Falso</option>
                                    <option value="Outro">Outro motivo</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="reportDescription" className="block text-sm font-semibold text-gray-700 mb-2">Detalhes adicionais (opcional)</label>
                                <textarea
                                    id="reportDescription"
                                    value={reportDescription}
                                    onChange={e => setReportDescription(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                                    placeholder="Descreva o que há de errado com este anúncio..."
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowReportModal(false)}
                                    className="flex-1 px-4 py-3 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl font-semibold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!reportReason || isSubmittingReport}
                                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
                                >
                                    {isSubmittingReport ? 'Enviando...' : 'Confirmar Denúncia'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showImageFullscreen && (
                <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4">
                    <button
                        type="button"
                        onClick={() => setShowImageFullscreen(false)}
                        className="absolute top-4 right-4 text-white/90 hover:text-white bg-black/40 rounded-full p-2"
                        aria-label="Fechar visualização"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {ad.images.length > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={goToPrevImage}
                                className="absolute left-4 md:left-8 text-white/90 hover:text-white bg-black/40 rounded-full p-2"
                                aria-label="Imagem anterior"
                            >
                                <ChevronLeft className="w-7 h-7" />
                            </button>
                            <button
                                type="button"
                                onClick={goToNextImage}
                                className="absolute right-4 md:right-8 text-white/90 hover:text-white bg-black/40 rounded-full p-2"
                                aria-label="Próxima imagem"
                            >
                                <ChevronRight className="w-7 h-7" />
                            </button>
                        </>
                    )}

                    <img
                        src={ad.images[activeImageIndex]}
                        alt={`${ad.title} - imagem ${activeImageIndex + 1}`}
                        className="max-w-[95vw] max-h-[90vh] object-contain"
                    />

                    {ad.images.length > 1 && (
                        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
                            {activeImageIndex + 1} / {ad.images.length}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
