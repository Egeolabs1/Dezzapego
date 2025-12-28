import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Plus, ArrowLeft, Trash2, Edit } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Ad } from '../../types';
import { formatPrice } from '../../lib/formatters';
import { toast } from 'sonner';

export default function MyAds() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [ads, setAds] = useState<Ad[]>([]);
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
                    {ads.map((ad) => (
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
                                </div>

                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                                    <span className="text-xs text-gray-500">
                                        {new Date(ad.publishedAt).toLocaleDateString('pt-BR')} -- {ad.views} visualizações
                                    </span>
                                    <div className="flex gap-2">
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
                    ))}
                </div>
            )}
        </div>
    );
}
