import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ImageUpload } from '../components/ImageUpload';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

import { CATEGORIES, CATEGORY_KEYS } from '../data/categories';

export default function EditAd() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        price: '',
        description: '',
        category: '',
        subcategory: '',
        images: [] as string[]
    });

    useEffect(() => {
        async function fetchAd() {
            if (!id || !user) return;
            try {
                const { data, error } = await supabase
                    .from('ads')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;

                // Verify ownership (security rule should handle this, but good for UI)
                // Check if seller ID inside JSONB matches
                if (data.seller.id !== user.id) {
                    toast.error('Você não tem permissão para editar este anúncio.');
                    navigate('/');
                    return;
                }

                setFormData({
                    title: data.title,
                    price: data.price.toString().replace('.', ','),
                    description: data.description,
                    category: data.category,
                    subcategory: data.subcategory || '',
                    images: data.images || []
                });
            } catch (error) {
                console.error('Error fetching ad:', error);
                toast.error('Erro ao carregar anúncio.');
                navigate('/meus-anuncios');
            } finally {
                setLoading(false);
            }
        }
        fetchAd();
    }, [id, user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !id) return;

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

        setSaving(true);

        try {
            const numericPrice = parseFloat(formData.price.replace(/[^\d.,]/g, '').replace(',', '.'));

            const { error } = await supabase
                .from('ads')
                .update({
                    title: formData.title,
                    price: isNaN(numericPrice) ? 0 : numericPrice,
                    description: formData.description,
                    category: formData.category,
                    subcategory: formData.subcategory,
                    images: formData.images,
                })
                .eq('id', id);

            if (error) throw error;

            toast.success('Anúncio atualizado com sucesso!');
            navigate('/meus-anuncios');
        } catch (error: any) {
            console.error('Error updating ad:', error);
            toast.error('Erro ao atualizar anúncio. Tente novamente.');
        } finally {
            setSaving(false);
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

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-80px)]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <button
                onClick={() => navigate('/meus-anuncios')}
                className="flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cancelar e Voltar
            </button>

            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Editar Anúncio</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Photos */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Fotos do Produto
                        </label>
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <ImageUpload
                                userId={user?.id || ''}
                                onUpload={handleImageUpload}
                                onRemove={handleImageRemove}
                                currentImages={formData.images}
                            />
                        </div>
                        <p className="text-xs text-gray-500">
                            Adicione até 6 fotos (máx. 5MB cada).
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
                            type="text" // text to allow comma
                            required
                            value={formData.price}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Category & Subcategory Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Category */}
                        <div className="space-y-2">
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                                Categoria
                            </label>
                            <select
                                id="category"
                                name="category"
                                required
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="">Selecione uma categoria</option>
                                {CATEGORY_KEYS.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Subcategory */}
                        <div className="space-y-2">
                            <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700">
                                Subcategoria
                            </label>
                            <select
                                id="subcategory"
                                name="subcategory"
                                required
                                disabled={!formData.category}
                                value={formData.subcategory}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                            >
                                <option value="">Selecione...</option>
                                {formData.category && CATEGORIES[formData.category]?.map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </select>
                        </div>
                    </div>
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
                            value={formData.description}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Salvando alterações...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Salvar Alterações
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
