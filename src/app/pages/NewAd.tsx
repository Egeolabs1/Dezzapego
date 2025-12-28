import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ImageUpload } from '../components/ImageUpload';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORIES, PROPERTY_TYPES } from '../data/categories';

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
        propertyType: '',
        condominium: '',
        iptu: '',
        images: [] as string[]
    });

    // Reset subcategory when category changes
    useEffect(() => {
        if (formData.category && !CATEGORIES[formData.category].includes(formData.subcategory)) {
            // If current subcategory doesn't belong to new category, reset it
            // Actually, usually we reset immediately upon category change, but here we can check consistency
        }
    }, [formData.category]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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

        if (!formData.subcategory) {
            toast.error('Selecione uma subcategoria.');
            return;
        }

        if (formData.category === 'Imóveis' && !formData.propertyType) {
            toast.error('Selecione o tipo do imóvel.');
            return;
        }

        setLoading(true);

        try {
            // Create seller object from user data
            const seller = {
                id: user.id,
                name: user.user_metadata.full_name || user.email?.split('@')[0],
                rating: 0, // Initial rating for new sellers
                verified: false, // Security Fix: Never default to true on client-side
                joinDate: new Date().toISOString(),
                type: user.user_metadata.account_type || 'personal'
            };

            const numericPrice = parseFloat(formData.price.replace(/[^\d.,]/g, '').replace(',', '.'));

            const { error } = await supabase
                .from('ads')
                .insert({
                    title: formData.title,
                    price: (isNaN(numericPrice) || numericPrice < 0) ? 0 : numericPrice,
                    description: formData.description,
                    category: formData.category,
                    subcategory: formData.subcategory,
                    propertyType: formData.category === 'Imóveis' ? formData.propertyType : null,
                    condominium: formData.category === 'Imóveis' && formData.condominium ? parseFloat(formData.condominium) : null,
                    iptu: formData.category === 'Imóveis' && formData.iptu ? parseFloat(formData.iptu) : null,
                    location: { state: 'SP', city: 'São Paulo' }, // Default for now
                    images: formData.images,
                    seller: seller,
                    featured: false,
                    views: 0
                });

            if (error) throw error;

            toast.success('Anúncio criado com sucesso!');
            navigate('/');
        } catch (error: any) {
            console.error('Error creating ad:', error);
            toast.error('Erro ao criar anúncio. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            if (name === 'category') {
                return { ...prev, [name]: value, subcategory: '' }; // Reset subcategory
            }
            return { ...prev, [name]: value };
        });
    };

    const handleImageUpload = (url: string) => {
        setFormData(prev => ({ ...prev, images: [...prev.images, url] }));
    };

    const handleImageRemove = (urlToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter(url => url !== urlToRemove)
        }));
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
                <p className="text-gray-600 mb-4">Você precisa estar logado para anunciar.</p>
                <button
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    Ir para Login
                </button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <button
                onClick={() => navigate('/')}
                className="flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para a Home
            </button>

            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Criar Novo Anúncio</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Photos */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Fotos do Produto
                        </label>
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <ImageUpload
                                onUpload={handleImageUpload}
                                onRemove={handleImageRemove}
                                currentImages={formData.images}
                            />
                        </div>
                        <p className="text-xs text-gray-500">
                            Adicione até 6 fotos (máx. 5MB cada). A primeira foto será a principal.
                        </p>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                            Título do Anúncio
                        </label>
                        <input
                            id="title"
                            name="title"
                            type="text"
                            required
                            placeholder="Ex: iPhone 13 Pro Max Conservado"
                            value={formData.title}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                        <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                            Preço (R$)
                        </label>
                        <input
                            id="price"
                            name="price"
                            type="text" // changed to text for formatting if needed, but keeping simple for now
                            required
                            placeholder="0,00"
                            value={formData.price}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Condo & IPTU (Only for Imóveis) */}
                    {formData.category === 'Imóveis' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="condominium" className="block text-sm font-medium text-gray-700">
                                    Condomínio (R$)
                                </label>
                                <input
                                    id="condominium"
                                    name="condominium"
                                    type="number"
                                    placeholder="0,00"
                                    value={formData.condominium || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="iptu" className="block text-sm font-medium text-gray-700">
                                    IPTU (R$)
                                </label>
                                <input
                                    id="iptu"
                                    name="iptu"
                                    type="number"
                                    placeholder="0,00"
                                    value={formData.iptu || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    )}



                    {formData.category === 'Imóveis' && (
                        <div className="space-y-2 col-span-1 md:col-span-2">
                            <label htmlFor="propertyType" className="block text-sm font-medium text-gray-700">
                                Tipo de Imóvel
                            </label>
                            <select
                                id="propertyType"
                                name="propertyType"
                                required
                                value={formData.propertyType}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="">Selecione o tipo do imóvel...</option>
                                {PROPERTY_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Description */}
                    <div className="space-y-2">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Descrição
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            required
                            rows={5}
                            placeholder="Conte detalhes sobre seu produto..."
                            value={formData.description}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Publicando...
                            </>
                        ) : (
                            'Publicar Anúncio'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
