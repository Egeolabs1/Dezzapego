import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ImageUpload } from '../components/ImageUpload';
import { Loader2, ArrowLeft, MapPin, Image as ImageIcon, Tag, FileText, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORY_SPECS } from '../data/categorySpecs';

const CATEGORIES = Object.keys(CATEGORY_SPECS);

const STATE_MAP: Record<string, string> = {
    'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM', 'Bahia': 'BA', 'Ceará': 'CE',
    'Distrito Federal': 'DF', 'Espírito Santo': 'ES', 'Goiás': 'GO', 'Maranhão': 'MA', 'Mato Grosso': 'MT',
    'Mato Grosso do Sul': 'MS', 'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
    'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
    'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC',
    'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO'
};

export default function NewAd() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        price: '',
        description: '',
        category: '',
        subcategory: '',
        images: [] as string[],
        details: {} as Record<string, any>,
        location: { state: 'SP', city: 'São Paulo', neighborhood: '', lat: null as number | null, lng: null as number | null } // NEW
    });

    // Reset details when category changes
    useEffect(() => {
        setFormData(prev => ({ ...prev, details: {} }));
    }, [formData.category]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // ... (auth checks)
        if (!user) {
            toast.error('Você precisa estar logado para anunciar.');
            navigate('/login');
            return;
        }

        if (formData.images.length === 0) {
            toast.error('Por favor, adicione pelo menos uma imagem ao seu anúncio.');
            return;
        }

        if (!formData.category) {
            toast.error('Selecione uma categoria.');
            return;
        }

        setLoading(true);

        try {
            const numericPrice = parseFloat(formData.price.replace(/[^\d.,]/g, '').replace(',', '.'));

            // Seller snapshot for backward compatibility and display
            const seller = {
                id: user.id,
                name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
                avatar_url: user.user_metadata?.avatar_url || null,
                verified: false,
            };

            const payload = {
                title: formData.title,
                price: (isNaN(numericPrice) || numericPrice < 0) ? 0 : numericPrice,
                description: formData.description,
                category: formData.category,
                subcategory: formData.subcategory,
                location: formData.location,
                lat: formData.location.lat,
                lng: formData.location.lng,
                images: formData.images,
                user_id: user.id,
                seller: seller, // Required by DB schema
                featured: false,
                views: 0,
                details: formData.details,
            };

            console.log('Submitting ad payload:', payload);

            const { data, error } = await supabase
                .from('ads')
                .insert(payload)
                .select(); // Validate insert returned data

            if (error) throw error;

            if (!data || data.length === 0) {
                throw new Error('Anúncio não foi salvo. Verifique suas permissões.');
            }

            console.log('Ad created successfully:', data);
            toast.success('Anúncio criado com sucesso!');
            navigate('/');
        } catch (error: any) {
            console.error('Error creating ad:', error);
            toast.error(error.message || 'Erro ao criar anúncio. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            if (name === 'category') {
                return { ...prev, [name]: value, subcategory: '', details: {} };
            }
            return { ...prev, [name]: value };
        });
    };

    const handleDetailChange = (name: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            details: { ...prev.details, [name]: value }
        }));
    };

    const renderDynamicFields = () => {
        if (!formData.category || !CATEGORY_SPECS[formData.category]) return null;

        const fields = CATEGORY_SPECS[formData.category].fields;

        return fields.map(field => (
            <div key={field.name} className="space-y-2">
                {field.type !== 'checkbox' && (
                    <label htmlFor={`field-${field.name}`} className="block text-sm font-medium text-gray-700">{field.label}</label>
                )}
                <div className="relative">
                    {field.type === 'select' ? (
                        <select
                            id={`field-${field.name}`}
                            value={formData.details[field.name] || ''}
                            onChange={(e) => handleDetailChange(field.name, e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all appearance-none cursor-pointer"
                            aria-label={field.label}
                        >
                            <option value="">Selecione...</option>
                            {field.options?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    ) : field.type === 'checkbox' ? (
                        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                            <input
                                type="checkbox"
                                checked={!!formData.details[field.name]}
                                onChange={(e) => handleDetailChange(field.name, e.target.checked)}
                                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                            />
                            <span className="text-gray-700 font-medium">{field.label}</span>
                        </label>
                    ) : (
                        <input
                            type={field.type === 'number' ? 'number' : 'text'}
                            placeholder={field.placeholder}
                            value={formData.details[field.name] || ''}
                            onChange={(e) => handleDetailChange(field.name, e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all placeholder:text-gray-400"
                        />
                    )}
                    {field.unit && field.type !== 'checkbox' && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
                            {field.unit}
                        </span>
                    )}
                </div>
            </div>
        ));
    };

    const handleImageUpload = (url: string) => {
        setFormData(prev => ({
            ...prev,
            images: [...prev.images, url]
        }));
    };

    const handleImageRemove = (urlToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter(url => url !== urlToRemove)
        }));
    };

    // ... check user login return ...

    // ... check user login return ...

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center text-gray-500 hover:text-purple-600 mb-8 transition-colors group"
                >
                    <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Voltar para a Home
                </button>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-8 text-center text-white">
                        <h1 className="text-3xl font-bold mb-2">Novo Anúncio</h1>
                        <p className="text-blue-100 opacity-90">Preencha os dados abaixo para publicar seu produto</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-10">
                        {/* Photos Section */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-gray-800 border-b pb-2">
                                <ImageIcon className="w-5 h-5 text-purple-600" />
                                <h2 className="text-xl font-semibold">Fotos</h2>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-purple-300 transition-colors">
                                <ImageUpload
                                    onUpload={handleImageUpload}
                                    onRemove={handleImageRemove}
                                    currentImages={formData.images}
                                />
                                <p className="text-center text-sm text-gray-500 mt-4">
                                    Adicione até 6 fotos (máx. 5MB cada). A primeira foto será a capa do anúncio.
                                </p>
                            </div>
                        </section>

                        {/* Details Section */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-2 text-gray-800 border-b pb-2">
                                <FileText className="w-5 h-5 text-purple-600" />
                                <h2 className="text-xl font-semibold">Detalhes do Produto</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 col-span-2">
                                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Título do Anúncio</label>
                                    <input
                                        id="title"
                                        name="title"
                                        type="text"
                                        required
                                        placeholder="Ex: iPhone 13 Pro Max 128GB Grafite"
                                        value={formData.title}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all placeholder:text-gray-400"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="price" className="block text-sm font-medium text-gray-700">Preço (R$)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            id="price"
                                            name="price"
                                            type="text"
                                            required
                                            placeholder="0,00"
                                            value={formData.price}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all placeholder:text-gray-400 font-medium"
                                        />
                                    </div>
                                </div>

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
                                            required
                                        >
                                            <option value="">Selecione...</option>
                                            {CATEGORIES.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
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
                                            required
                                            disabled={!formData.category}
                                        >
                                            <option value="">Selecione...</option>
                                            {formData.category && CATEGORY_SPECS[formData.category]?.subcategories?.map(sub => (
                                                <option key={sub} value={sub}>{sub}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {renderDynamicFields()}

                                <div className="space-y-2 col-span-2">
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descrição Detalhada</label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        required
                                        rows={6}
                                        placeholder="Descreva seu produto com o máximo de detalhes (tempo de uso, estado de conservação, acessórios inclusos...)"
                                        value={formData.description}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all resize-none placeholder:text-gray-400"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Location Section */}
                        <section className="space-y-6">
                            <div className="flex items-center justify-between border-b pb-2">
                                <div className="flex items-center gap-2 text-gray-800">
                                    <MapPin className="w-5 h-5 text-purple-600" />
                                    <h2 className="text-xl font-semibold">Localização</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!navigator.geolocation) {
                                            toast.error('Geolocalização não suportada no seu navegador.');
                                            return;
                                        }
                                        const toastId = toast.loading('Obtendo localização...');
                                        navigator.geolocation.getCurrentPosition(
                                            async (position) => {
                                                const { latitude, longitude } = position.coords;
                                                try {
                                                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                                                    const data = await response.json();
                                                    const address = data.address || {};
                                                    const city = address.city || address.town || address.village || address.municipality || 'São Paulo';

                                                    // Robust State Detection
                                                    let state = address.state_code || '';
                                                    if (!state && address['ISO3166-2-lvl4']) {
                                                        state = address['ISO3166-2-lvl4'].split('-')[1];
                                                    }
                                                    if (!state && address.state) {
                                                        state = STATE_MAP[address.state] || address.state.substring(0, 2);
                                                    }
                                                    state = (state || 'SP').toUpperCase();

                                                    const neighborhood = address.suburb || address.neighbourhood || address.residential || address.quarter || '';

                                                    setFormData(prev => ({
                                                        ...prev,
                                                        location: {
                                                            ...prev.location,
                                                            lat: latitude,
                                                            lng: longitude,
                                                            city,
                                                            state: state.substring(0, 2).toUpperCase(),
                                                            neighborhood
                                                        }
                                                    }));
                                                    toast.dismiss(toastId);
                                                    toast.success('Localização atualizada!');
                                                } catch (err) {
                                                    console.error(err);
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        location: { ...prev.location, lat: latitude, lng: longitude }
                                                    }));
                                                    toast.dismiss(toastId);
                                                    toast.success('Coordenadas salvas!');
                                                }
                                            },
                                            (error) => {
                                                toast.dismiss(toastId);
                                                toast.error('Erro ao obter localização: ' + error.message);
                                            }
                                        );
                                    }}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 transition-colors"
                                >
                                    <MapPin className="w-4 h-4" />
                                    Usar minha localização atual
                                </button>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                    <div className="space-y-2 md:col-span-1">
                                        <label htmlFor="location-state" className="block text-sm font-medium text-gray-700">Estado</label>
                                        <input
                                            id="location-state"
                                            type="text"
                                            value={formData.location.state}
                                            onChange={(e) => setFormData(prev => ({ ...prev, location: { ...prev.location, state: e.target.value.toUpperCase().slice(0, 2) } }))}
                                            maxLength={2}
                                            className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all text-center uppercase"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label htmlFor="location-city" className="block text-sm font-medium text-gray-700">Cidade</label>
                                        <input
                                            id="location-city"
                                            type="text"
                                            value={formData.location.city}
                                            onChange={(e) => setFormData(prev => ({ ...prev, location: { ...prev.location, city: e.target.value } }))}
                                            className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Bairro</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: Centro, Copacabana..."
                                            value={formData.location.neighborhood || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, location: { ...prev.location, neighborhood: e.target.value } }))}
                                            className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-blue-600/70 mt-3 flex items-center gap-1">
                                    {formData.location.lat && formData.location.lng ? (
                                        <>
                                            <MapPin className="w-3 h-3" />
                                            Coordenadas: {formData.location.lat.toFixed(4)}, {formData.location.lng.toFixed(4)}
                                        </>
                                    ) : (
                                        'Recomendamos usar a localização automática para maior precisão.'
                                    )}
                                </p>
                            </div>
                        </section>

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                        Publicando seu Anúncio...
                                    </>
                                ) : (
                                    <>
                                        <span>Publicar Anúncio Agora</span>
                                        <Tag className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                            <p className="text-center text-sm text-gray-500 mt-4">
                                Ao publicar, você concorda com nossos Termos de Uso e Política de Privacidade.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
