import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ImageUpload } from '../components/ImageUpload';
import { Loader2, ArrowLeft, Save, MapPin, Image as ImageIcon, Tag, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORY_SPECS } from '../data/categorySpecs';
import { AdSeoHints } from '../../components/AdSeoHints';
import SEO from '../../components/SEO';
import { AdCategoryFields } from '../components/AdCategoryFields';
import { AdFormStepper, type StepDef } from '../components/AdFormStepper';
import { AdFormReview } from '../components/AdFormReview';
import {
    buildNormalizedDetails,
    formatCurrencyFromNumber,
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

const EDIT_STEPS: StepDef[] = [
    { id: 'category', label: 'Categoria' },
    { id: 'main', label: 'Dados principais' },
    { id: 'details', label: 'Detalhes' },
    { id: 'media', label: 'Fotos e local' },
    { id: 'review', label: 'Revisão' },
];

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

type FormState = {
    title: string;
    price: string;
    description: string;
    category: string;
    subcategory: string;
    images: string[];
    details: Record<string, unknown>;
    location: AdLocationForm;
};

export default function EditAd() {
    const { id } = useParams<{ id: string }>();
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [step, setStep] = useState(0);

    const [formData, setFormData] = useState<FormState>({
        title: '',
        price: '',
        description: '',
        category: '',
        subcategory: '',
        images: [],
        details: {},
        location: {
            state: 'SP',
            city: '',
            neighborhood: '',
            lat: null,
            lng: null,
        },
    });

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            toast.error('Você precisa estar logado para editar anúncios.');
            navigate('/login');
        }
    }, [authLoading, user, navigate]);

    useEffect(() => {
        async function fetchAd() {
            if (authLoading || !id || !user) return;
            try {
                const { data, error } = await supabase.from('ads').select('*').eq('id', id).single();

                if (error) throw error;

                const seller = data.seller as { id?: string } | null;
                const sellerId = seller?.id;
                if (data.user_id !== user.id && sellerId !== user.id) {
                    toast.error('Você não tem permissão para editar este anúncio.');
                    navigate('/');
                    return;
                }

                const loc = (data.location || {}) as Partial<AdLocationForm> & Record<string, unknown>;

                setFormData({
                    title: data.title,
                    price: formatCurrencyFromNumber(data.price),
                    description: data.description,
                    category: data.category,
                    subcategory: data.subcategory || '',
                    images: data.images || [],
                    details: data.details || {},
                    location: {
                        state: String(loc.state || 'SP')
                            .toUpperCase()
                            .slice(0, 2),
                        city: String(loc.city || ''),
                        neighborhood: String(loc.neighborhood || ''),
                        lat: (data.lat as number | null | undefined) ?? (loc.lat as number | null) ?? null,
                        lng: (data.lng as number | null | undefined) ?? (loc.lng as number | null) ?? null,
                    },
                });
            } catch {
                toast.error('Erro ao carregar anúncio.');
                navigate('/meus-anuncios');
            } finally {
                setLoading(false);
            }
        }
        fetchAd();
    }, [authLoading, id, user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !id) return;

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

        setSaving(true);

        try {
            const numericPrice = parseCurrencyInput(formData.price);
            const normalizedDetails = buildNormalizedDetails(
                formData.category,
                formData.subcategory,
                formData.details,
            );

            const { error } = await supabase
                .from('ads')
                .update({
                    title: formData.title.trim(),
                    price: Number.isNaN(numericPrice) ? 0 : numericPrice,
                    description: formData.description.trim(),
                    category: formData.category,
                    subcategory: formData.subcategory,
                    images: validImages,
                    details: normalizedDetails,
                    location: formData.location,
                    lat: formData.location.lat,
                    lng: formData.location.lng,
                })
                .eq('id', id);

            if (error) throw error;

            toast.success('Anúncio atualizado com sucesso!');
            navigate('/meus-anuncios');
        } catch {
            toast.error('Erro ao atualizar anúncio. Tente novamente.');
        } finally {
            setSaving(false);
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
        setStep((s) => Math.min(s + 1, EDIT_STEPS.length - 1));
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
                        address.city || address.town || address.village || address.municipality || formData.location.city;

                    let state = address.state_code || '';
                    if (!state && address['ISO3166-2-lvl4']) {
                        state = address['ISO3166-2-lvl4'].split('-')[1];
                    }
                    if (!state && address.state) {
                        state = STATE_MAP[address.state] || address.state.substring(0, 2);
                    }
                    state = (state || formData.location.state || 'SP').toUpperCase();

                    const neighborhood =
                        address.suburb || address.neighbourhood || address.residential || address.quarter || '';

                    setFormData((prev) => ({
                        ...prev,
                        location: {
                            ...prev.location,
                            lat: latitude,
                            lng: longitude,
                            city: city || prev.location.city,
                            state: state.substring(0, 2).toUpperCase(),
                            neighborhood: neighborhood || prev.location.neighborhood,
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

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-80px)]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <SEO title="Editar anúncio" description="Edite seu anúncio no Dezzapego." noIndex />
            <button
                type="button"
                onClick={() => navigate('/meus-anuncios')}
                className="flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cancelar e voltar
            </button>

            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 border border-gray-100">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Editar anúncio</h1>
                <p className="text-sm text-gray-500 mb-6">Revise cada etapa antes de salvar.</p>

                <form onSubmit={handleSubmit}>
                    <AdFormStepper steps={EDIT_STEPS} currentIndex={step} onStepClick={(i) => setStep(i)} />

                    {step === 0 && (
                        <section className="space-y-6">
                            <div className="flex items-center gap-2 text-gray-800 border-b pb-2">
                                <Tag className="w-5 h-5 text-blue-600" />
                                <h2 className="text-xl font-semibold">Categoria</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                                        Categoria
                                    </label>
                                    <select
                                        id="category"
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="">Selecione</option>
                                        {Object.keys(CATEGORY_SPECS).map((cat) => (
                                            <option key={cat} value={cat}>
                                                {cat}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700">
                                        Subcategoria
                                    </label>
                                    <select
                                        id="subcategory"
                                        name="subcategory"
                                        disabled={!formData.category}
                                        value={formData.subcategory}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100"
                                    >
                                        <option value="">Selecione</option>
                                        {formData.category &&
                                            CATEGORY_SPECS[formData.category]?.subcategories?.map((sub) => (
                                                <option key={sub} value={sub}>
                                                    {sub}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>
                        </section>
                    )}

                    {step === 1 && (
                        <section className="space-y-6">
                            <div className="flex items-center gap-2 text-gray-800 border-b pb-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                <h2 className="text-xl font-semibold">Dados principais</h2>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                                        Título
                                    </label>
                                    <input
                                        id="title"
                                        name="title"
                                        type="text"
                                        maxLength={100}
                                        value={formData.title}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                                        Preço (R$)
                                    </label>
                                    <input
                                        id="price"
                                        name="price"
                                        type="text"
                                        inputMode="decimal"
                                        value={formData.price}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                        Descrição
                                    </label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        rows={5}
                                        value={formData.description}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    />
                                </div>
                                <AdSeoHints titleLen={formData.title.length} descriptionLen={formData.description.length} />
                            </div>
                        </section>
                    )}

                    {step === 2 && (
                        <section className="space-y-6">
                            <div className="flex items-center gap-2 text-gray-800 border-b pb-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                <h2 className="text-xl font-semibold">Detalhes da categoria</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <AdCategoryFields
                                    category={formData.category}
                                    subcategory={formData.subcategory}
                                    details={formData.details}
                                    onDetailChange={handleDetailChange}
                                    variant="edit"
                                />
                            </div>
                            {formData.category && formData.subcategory && (
                                <p className="text-xs text-gray-500">
                                    Campos com <span className="text-red-500">*</span> são obrigatórios.
                                </p>
                            )}
                        </section>
                    )}

                    {step === 3 && (
                        <section className="space-y-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-gray-800 border-b pb-2">
                                    <ImageIcon className="w-5 h-5 text-blue-600" />
                                    <h2 className="text-xl font-semibold">Fotos</h2>
                                </div>
                                <ImageUpload
                                    variant="ad"
                                    userId={user?.id || ''}
                                    onUpload={(url) =>
                                        setFormData((prev) => ({ ...prev, images: [...prev.images, url] }))
                                    }
                                    onRemove={(url) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            images: prev.images.filter((u) => u !== url),
                                        }))
                                    }
                                    onReorder={(newImages) => setFormData((prev) => ({ ...prev, images: newImages }))}
                                    currentImages={formData.images}
                                />
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-blue-600" />
                                        <h2 className="text-xl font-semibold">Localização</h2>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={useMyLocation}
                                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                        <MapPin className="w-4 h-4" />
                                        Usar minha localização
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                    <div className="md:col-span-1 space-y-2">
                                        <label htmlFor="edit-ad-loc-uf" className="text-sm font-medium text-gray-700">
                                            UF
                                        </label>
                                        <input
                                            id="edit-ad-loc-uf"
                                            type="text"
                                            maxLength={2}
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
                                            className="w-full px-3 py-2 border rounded-lg uppercase text-center"
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label htmlFor="edit-ad-loc-city" className="text-sm font-medium text-gray-700">
                                            Cidade
                                        </label>
                                        <input
                                            id="edit-ad-loc-city"
                                            type="text"
                                            value={formData.location.city}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    location: { ...prev.location, city: e.target.value },
                                                }))
                                            }
                                            className="w-full px-3 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div className="md:col-span-3 space-y-2">
                                        <label htmlFor="edit-ad-loc-neighborhood" className="text-sm font-medium text-gray-700">
                                            Bairro
                                        </label>
                                        <input
                                            id="edit-ad-loc-neighborhood"
                                            type="text"
                                            value={formData.location.neighborhood || ''}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    location: { ...prev.location, neighborhood: e.target.value },
                                                }))
                                            }
                                            className="w-full px-3 py-2 border rounded-lg"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {step === 4 && (
                        <section>
                            <AdFormReview
                                title={formData.title}
                                description={formData.description}
                                price={formData.price}
                                category={formData.category}
                                subcategory={formData.subcategory}
                                images={formData.images}
                                location={formData.location}
                            />
                        </section>
                    )}

                    <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between border-t pt-6">
                        <button
                            type="button"
                            onClick={goBack}
                            disabled={step === 0 || saving}
                            className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <div className="flex gap-3 justify-end">
                            {step < EDIT_STEPS.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={goNext}
                                    className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
                                >
                                    Próximo
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-8 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold flex items-center gap-2 disabled:opacity-70"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            Salvar alterações
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
