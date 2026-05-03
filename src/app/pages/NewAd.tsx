import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ImageUpload } from '../components/ImageUpload';
import { Loader2, ArrowLeft, MapPin, Image as ImageIcon, Tag, FileText, DollarSign, Star } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORY_SPECS, getCategoryFields } from '../data/categorySpecs';
import { AdSeoHints } from '../../components/AdSeoHints';
import SEO from '../../components/SEO';
import { AdCategoryFields } from '../components/AdCategoryFields';
import { AdFormStepper, type StepDef } from '../components/AdFormStepper';
import { AdFormReview } from '../components/AdFormReview';
import {
    buildNormalizedDetails,
    formatCurrencyInput,
    getMissingRequiredDetailLabels,
    getValidImages,
    parseCurrencyInput,
    validateAdBasics,
    validateAdCategoryStep,
    validateAdMainFields,
    validateLocation,
    type AdLocationForm,
} from '../../lib/adFormHelpers';

const CATEGORIES = Object.keys(CATEGORY_SPECS);

const STATE_MAP: Record<string, string> = {
    Acre: 'AC',
    Alagoas: 'AL',
    Amapá: 'AP',
    Amazonas: 'AM',
    Bahia: 'BA',
    Ceará: 'CE',
    'Distrito Federal': 'DF',
    'Espírito Santo': 'ES',
    Goiás: 'GO',
    Maranhão: 'MA',
    'Mato Grosso': 'MT',
    'Mato Grosso do Sul': 'MS',
    'Minas Gerais': 'MG',
    Pará: 'PA',
    Paraíba: 'PB',
    Paraná: 'PR',
    Pernambuco: 'PE',
    Piauí: 'PI',
    'Rio de Janeiro': 'RJ',
    'Rio Grande do Norte': 'RN',
    'Rio Grande do Sul': 'RS',
    Rondônia: 'RO',
    Roraima: 'RR',
    'Santa Catarina': 'SC',
    'São Paulo': 'SP',
    Sergipe: 'SE',
    Tocantins: 'TO',
};

const AD_STEPS: StepDef[] = [
    { id: 'category', label: 'Categoria' },
    { id: 'main', label: 'Dados principais' },
    { id: 'details', label: 'Detalhes' },
    { id: 'media', label: 'Fotos e local' },
    { id: 'review', label: 'Revisão' },
];

export default function NewAd() {
    const { user, profile, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(0);
    const [showPublishRequirements, setShowPublishRequirements] = useState(false);
    const [requiredPhone, setRequiredPhone] = useState('');
    const [requiredDocument, setRequiredDocument] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        price: '',
        description: '',
        category: '',
        subcategory: '',
        images: [] as string[],
        details: {} as Record<string, unknown>,
        location: {
            state: 'SP',
            city: 'São Paulo',
            neighborhood: '',
            lat: null as number | null,
            lng: null as number | null,
        } satisfies AdLocationForm,
    });

    useEffect(() => {
        if (!user) {
            toast.error('Você precisa estar logado para criar um anúncio.');
            navigate('/login');
        }
    }, [user, navigate]);

    const onlyDigits = (value: string) => value.replace(/\D/g, '');
    const formatPhoneMask = (value: string) => {
        const d = onlyDigits(value).slice(0, 11);
        if (d.length <= 2) return d;
        if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
        if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
        return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    };
    const formatDocumentMask = (value: string) => {
        const d = onlyDigits(value).slice(0, 14);
        if (d.length <= 11) {
            if (d.length <= 3) return d;
            if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
            if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
            return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
        }
        if (d.length <= 2) return d;
        if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
        if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
        if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
        return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
    };
    const hasPhoneForPublish = (value: string) => onlyDigits(value).length >= 10;
    const hasDocumentForPublish = (value: string) => {
        const len = onlyDigits(value).length;
        return len === 11 || len === 14;
    };
    const profileHasRequiredData = () =>
        hasPhoneForPublish(profile?.phone || '') && hasDocumentForPublish(profile?.cpf_cnpj || '');

    useEffect(() => {
        setRequiredPhone(formatPhoneMask(profile?.phone || user?.user_metadata?.phone || ''));
        setRequiredDocument(formatDocumentMask(profile?.cpf_cnpj || user?.user_metadata?.cpf_cnpj || ''));
    }, [profile?.phone, profile?.cpf_cnpj, user?.user_metadata?.phone, user?.user_metadata?.cpf_cnpj]);

    const publishAd = async () => {
        if (!user) {
            toast.error('Você precisa estar logado para anunciar.');
            navigate('/login');
            return;
        }

        const validImages = getValidImages(formData.images);
        const basics = validateAdBasics({
            title: formData.title,
            description: formData.description,
            category: formData.category,
            subcategory: formData.subcategory,
            price: formData.price,
            images: validImages,
        });
        if (basics) {
            toast.error(basics);
            return;
        }

        const locErr = validateLocation(formData.location);
        if (locErr) {
            toast.error(locErr);
            setStep(3);
            return;
        }

        const missing = getMissingRequiredDetailLabels(formData.category, formData.subcategory, formData.details);
        if (missing.length > 0) {
            toast.error(`Preencha: ${missing.join(', ')}`);
            setStep(2);
            return;
        }

        setLoading(true);

        try {
            const numericPrice = parseCurrencyInput(formData.price);

            const seller = {
                id: user.id,
                name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
                avatar_url: user.user_metadata?.avatar_url || null,
                verified: false,
            };

            const payload = {
                title: formData.title.trim(),
                price: Number.isNaN(numericPrice) || numericPrice < 0 ? 0 : numericPrice,
                description: formData.description.trim(),
                category: formData.category,
                subcategory: formData.subcategory,
                location: formData.location,
                lat: formData.location.lat,
                lng: formData.location.lng,
                images: validImages,
                user_id: user.id,
                seller,
                featured: false,
                views: 0,
                details: buildNormalizedDetails(formData.category, formData.subcategory, formData.details),
            };

            const { data, error } = await supabase.from('ads').insert(payload).select();

            if (error) throw error;

            if (!data || data.length === 0) {
                throw new Error('Anúncio não foi salvo. Verifique suas permissões.');
            }

            toast.success('Anúncio criado com sucesso!');
            navigate('/');
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Erro ao criar anúncio. Tente novamente.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast.error('Você precisa estar logado para anunciar.');
            navigate('/login');
            return;
        }
        if (!profileHasRequiredData()) {
            setRequiredPhone(formatPhoneMask(profile?.phone || user.user_metadata?.phone || ''));
            setRequiredDocument(formatDocumentMask(profile?.cpf_cnpj || user.user_metadata?.cpf_cnpj || ''));
            setShowPublishRequirements(true);
            return;
        }
        await publishAd();
    };

    const handleSaveRequirementsAndPublish = async () => {
        if (!user) return;
        if (!hasPhoneForPublish(requiredPhone)) {
            toast.error('Informe um telefone/WhatsApp válido com DDD.');
            return;
        }
        if (!hasDocumentForPublish(requiredDocument)) {
            toast.error('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                phone: onlyDigits(requiredPhone),
                cpf_cnpj: onlyDigits(requiredDocument),
                updated_at: new Date().toISOString(),
            });
            if (error) throw error;
            await refreshProfile();
            setShowPublishRequirements(false);
            toast.success('Dados obrigatórios salvos. Publicando anúncio...');
            await publishAd();
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Não foi possível salvar os dados.';
            toast.error(msg);
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            if (name === 'price') {
                return { ...prev, price: formatCurrencyInput(value) };
            }
            if (name === 'category') {
                return { ...prev, [name]: value, subcategory: '', details: {} };
            }
            if (name === 'subcategory') {
                return { ...prev, [name]: value, details: {} };
            }
            return { ...prev, [name]: value };
        });
    };

    const handleDetailChange = (name: string, value: unknown) => {
        setFormData((prev) => ({
            ...prev,
            details: { ...prev.details, [name]: value },
        }));
    };

    const handleImageUpload = (url: string) => {
        setFormData((prev) => ({ ...prev, images: [...prev.images, url] }));
    };

    const handleImageRemove = (urlToRemove: string) => {
        setFormData((prev) => ({
            ...prev,
            images: prev.images.filter((url) => url !== urlToRemove),
        }));
    };

    const validateCurrentStep = (): boolean => {
        if (step === 0) {
            const err = validateAdCategoryStep(formData.category, formData.subcategory);
            if (err) {
                toast.error(err);
                return false;
            }
            return true;
        }
        if (step === 1) {
            const err = validateAdMainFields({
                title: formData.title,
                description: formData.description,
                price: formData.price,
            });
            if (err) {
                toast.error(err);
                return false;
            }
            return true;
        }
        if (step === 2) {
            const missing = getMissingRequiredDetailLabels(
                formData.category,
                formData.subcategory,
                formData.details,
            );
            if (missing.length > 0) {
                toast.error(`Preencha os campos obrigatórios: ${missing.join(', ')}`);
                return false;
            }
            const fields = getCategoryFields(formData.category, formData.subcategory);
            if (fields.length === 0) {
                toast.info('Não há campos extras para esta categoria. Você pode avançar.');
            }
            return true;
        }
        if (step === 3) {
            const imgs = getValidImages(formData.images);
            if (imgs.length === 0) {
                toast.error('Adicione pelo menos uma foto.');
                return false;
            }
            const locErr = validateLocation(formData.location);
            if (locErr) {
                toast.error(locErr);
                return false;
            }
            return true;
        }
        return true;
    };

    const goNext = () => {
        if (!validateCurrentStep()) return;
        setStep((s) => Math.min(s + 1, AD_STEPS.length - 1));
    };

    const goBack = () => setStep((s) => Math.max(s - 1, 0));

    const useMyLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocalização não suportada no seu navegador.');
            return;
        }
        const toastId = toast.loading('Obtendo localização...');
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                    );
                    const data = await response.json();
                    const address = data.address || {};
                    const city =
                        address.city || address.town || address.village || address.municipality || 'São Paulo';

                    let state = address.state_code || '';
                    if (!state && address['ISO3166-2-lvl4']) {
                        state = address['ISO3166-2-lvl4'].split('-')[1];
                    }
                    if (!state && address.state) {
                        state = STATE_MAP[address.state] || address.state.substring(0, 2);
                    }
                    state = (state || 'SP').toUpperCase();

                    const neighborhood =
                        address.suburb || address.neighbourhood || address.residential || address.quarter || '';

                    setFormData((prev) => ({
                        ...prev,
                        location: {
                            ...prev.location,
                            lat: latitude,
                            lng: longitude,
                            city,
                            state: state.substring(0, 2).toUpperCase(),
                            neighborhood,
                        },
                    }));
                    toast.dismiss(toastId);
                    toast.success('Localização atualizada!');
                } catch {
                    setFormData((prev) => ({
                        ...prev,
                        location: { ...prev.location, lat: latitude, lng: longitude },
                    }));
                    toast.dismiss(toastId);
                    toast.success('Coordenadas salvas!');
                }
            },
            (error) => {
                toast.dismiss(toastId);
                toast.error('Erro ao obter localização: ' + error.message);
            },
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <SEO title="Novo anúncio" description="Publique um anúncio no Dezzapego." noIndex />
            <div className="max-w-4xl mx-auto">
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="flex items-center text-gray-500 hover:text-purple-600 mb-8 transition-colors group"
                >
                    <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Voltar para a Home
                </button>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-8 text-center text-white">
                        <h1 className="text-3xl font-bold mb-2">Novo Anúncio</h1>
                        <p className="text-blue-100 opacity-90">Siga as etapas para publicar com mais clareza e qualidade</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8">
                        <AdFormStepper steps={AD_STEPS} currentIndex={step} onStepClick={(i) => setStep(i)} />

                        {step === 0 && (
                            <section className="space-y-6 animate-in fade-in duration-200">
                                <div className="flex items-center gap-2 text-gray-800 border-b pb-2">
                                    <Tag className="w-5 h-5 text-purple-600" />
                                    <h2 className="text-xl font-semibold">Categoria do anúncio</h2>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Escolha onde seu anúncio se encaixa melhor. Isso ajuda compradores a encontrarem você.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Categoria</label>
                                        <div className="relative">
                                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <select
                                                name="category"
                                                title="Categoria"
                                                value={formData.category}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="">Selecione...</option>
                                                {CATEGORIES.map((cat) => (
                                                    <option key={cat} value={cat}>
                                                        {cat}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Subcategoria</label>
                                        <div className="relative">
                                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <select
                                                name="subcategory"
                                                title="Subcategoria"
                                                value={formData.subcategory}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={!formData.category}
                                            >
                                                <option value="">Selecione...</option>
                                                {formData.category &&
                                                    CATEGORY_SPECS[formData.category]?.subcategories?.map((sub) => (
                                                        <option key={sub} value={sub}>
                                                            {sub}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {step === 1 && (
                            <section className="space-y-6 animate-in fade-in duration-200">
                                <div className="flex items-center gap-2 text-gray-800 border-b pb-2">
                                    <FileText className="w-5 h-5 text-purple-600" />
                                    <h2 className="text-xl font-semibold">Informações principais</h2>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                                            Título do anúncio
                                        </label>
                                        <input
                                            id="title"
                                            name="title"
                                            type="text"
                                            maxLength={100}
                                            placeholder="Ex: iPhone 13 Pro Max 128GB Grafite"
                                            value={formData.title}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all placeholder:text-gray-400"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                                            Preço (R$)
                                        </label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                id="price"
                                                name="price"
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="0,00"
                                                value={formData.price}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all placeholder:text-gray-400 font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                            Descrição detalhada
                                        </label>
                                        <textarea
                                            id="description"
                                            name="description"
                                            rows={6}
                                            placeholder="Estado de conservação, o que acompanha, medidas, histórico..."
                                            value={formData.description}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all resize-none placeholder:text-gray-400"
                                        />
                                    </div>
                                    <AdSeoHints titleLen={formData.title.length} descriptionLen={formData.description.length} />
                                </div>
                            </section>
                        )}

                        {step === 2 && (
                            <section className="space-y-6 animate-in fade-in duration-200">
                                <div className="flex items-center gap-2 text-gray-800 border-b pb-2">
                                    <FileText className="w-5 h-5 text-purple-600" />
                                    <h2 className="text-xl font-semibold">Detalhes da categoria</h2>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Campos específicos para <strong>{formData.category}</strong> —{' '}
                                    <strong>{formData.subcategory}</strong>.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <AdCategoryFields
                                        category={formData.category}
                                        subcategory={formData.subcategory}
                                        details={formData.details}
                                        onDetailChange={handleDetailChange}
                                        variant="new"
                                    />
                                    {formData.category && formData.subcategory && (
                                        <div className="col-span-2 text-xs text-gray-500">
                                            Campos com <span className="text-red-500">*</span> são obrigatórios para esta
                                            subcategoria.
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {step === 3 && (
                            <section className="space-y-8 animate-in fade-in duration-200">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-gray-800 border-b pb-2">
                                        <ImageIcon className="w-5 h-5 text-purple-600" />
                                        <h2 className="text-xl font-semibold">Fotos</h2>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        Pelo menos uma foto é obrigatória. A primeira imagem será a capa do anúncio.
                                    </p>
                                    <div className="bg-gray-50 p-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-purple-300 transition-colors">
                                        <ImageUpload
                                            variant="ad"
                                            userId={user?.id || ''}
                                            onUpload={handleImageUpload}
                                            onRemove={handleImageRemove}
                                            onReorder={(newImages) => setFormData((prev) => ({ ...prev, images: newImages }))}
                                            currentImages={formData.images}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <div className="flex items-center gap-2 text-gray-800">
                                            <MapPin className="w-5 h-5 text-purple-600" />
                                            <h2 className="text-xl font-semibold">Localização</h2>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={useMyLocation}
                                            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 transition-colors"
                                        >
                                            <MapPin className="w-4 h-4" />
                                            Usar minha localização
                                        </button>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                            <div className="space-y-2 md:col-span-1">
                                                <label htmlFor="location-state" className="block text-sm font-medium text-gray-700">
                                                    Estado
                                                </label>
                                                <input
                                                    id="location-state"
                                                    type="text"
                                                    value={formData.location.state}
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            location: {
                                                                ...prev.location,
                                                                state: e.target.value.toUpperCase().slice(0, 2),
                                                            },
                                                        }))
                                                    }
                                                    maxLength={2}
                                                    className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all text-center uppercase"
                                                />
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <label htmlFor="location-city" className="block text-sm font-medium text-gray-700">
                                                    Cidade
                                                </label>
                                                <input
                                                    id="location-city"
                                                    type="text"
                                                    value={formData.location.city}
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            location: { ...prev.location, city: e.target.value },
                                                        }))
                                                    }
                                                    className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2 md:col-span-3">
                                                <label className="block text-sm font-medium text-gray-700">Bairro</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ex: Centro, Copacabana..."
                                                    value={formData.location.neighborhood || ''}
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            location: { ...prev.location, neighborhood: e.target.value },
                                                        }))
                                                    }
                                                    className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-blue-600/70 mt-3 flex items-center gap-1">
                                            {formData.location.lat != null && formData.location.lng != null ? (
                                                <>
                                                    <MapPin className="w-3 h-3" />
                                                    Coordenadas: {formData.location.lat.toFixed(4)},{' '}
                                                    {formData.location.lng.toFixed(4)}
                                                </>
                                            ) : (
                                                'Recomendamos usar a localização automática para maior precisão.'
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </section>
                        )}

                        {step === 4 && (
                            <section className="space-y-6 animate-in fade-in duration-200">
                                <AdFormReview
                                    title={formData.title}
                                    description={formData.description}
                                    price={formData.price}
                                    category={formData.category}
                                    subcategory={formData.subcategory}
                                    images={formData.images}
                                    location={formData.location}
                                />

                                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-yellow-100 rounded-full text-yellow-600">
                                            <Star className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-sm font-medium text-gray-900">Destacar anúncio</h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Depois de publicar, você pode destacar em &quot;Meus Anúncios&quot; com Stripe ou PIX.
                                            </p>
                                            <div className="mt-3">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                toast.info('Use Meus Anúncios para comprar destaque.');
                                                                e.target.checked = false;
                                                            }
                                                        }}
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">
                                                        Quero saber mais sobre destaque
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:items-center border-t border-gray-100 pt-6">
                            <button
                                type="button"
                                onClick={goBack}
                                disabled={step === 0 || loading}
                                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Anterior
                            </button>
                            <div className="flex gap-3 justify-end">
                                {step < AD_STEPS.length - 1 ? (
                                    <button
                                        type="button"
                                        onClick={goNext}
                                        className="px-6 py-2.5 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700"
                                    >
                                        Próximo
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg hover:shadow-xl disabled:opacity-70 flex items-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Publicando...
                                            </>
                                        ) : (
                                            <>
                                                <Tag className="w-5 h-5" />
                                                Publicar anúncio
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className="text-center text-sm text-gray-500 mt-4">
                            Ao publicar, você concorda com os Termos de Uso e Política de Privacidade.
                        </p>
                    </form>
                </div>
            </div>
            {showPublishRequirements && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-5">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Dados obrigatórios para publicar</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Falta completar seu <strong>telefone/WhatsApp</strong> e <strong>CPF/CNPJ</strong>.
                                Preencha abaixo para concluir a publicação.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">Telefone / WhatsApp</label>
                                <input
                                    type="tel"
                                    placeholder="(00) 00000-0000"
                                    value={requiredPhone}
                                    onChange={(e) => setRequiredPhone(formatPhoneMask(e.target.value))}
                                    className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">CPF ou CNPJ</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Somente números"
                                    value={requiredDocument}
                                    onChange={(e) => setRequiredDocument(formatDocumentMask(e.target.value))}
                                    className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setShowPublishRequirements(false)}
                                disabled={loading}
                                className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveRequirementsAndPublish}
                                disabled={loading}
                                className="px-5 py-2.5 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:opacity-60 inline-flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Salvar e publicar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
