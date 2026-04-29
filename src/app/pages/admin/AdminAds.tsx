import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { formatPrice, formatDate } from '../../../lib/formatters';
import { Trash2, Edit, Eye, Search, Star, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { logAdminAction } from '../../../lib/adminLogger';

export default function AdminAds() {
    const { user } = useAuth();
    const [ads, setAds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchAds();
    }, []);

    async function fetchAds() {
        try {
            const { data, error } = await supabase
                .from('ads')
                .select('*')
                .order('publishedAt', { ascending: false });

            if (error) throw error;
            setAds(data || []);
        } catch (error) {
            console.error('Error fetching ads:', error);
            toast.error('Erro ao carregar anúncios.');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Tem certeza que deseja excluir este anúncio permanentemente?')) return;

        try {
            const { error } = await supabase.from('ads').delete().eq('id', id);
            if (error) throw error;

            await logAdminAction(user?.email, 'DELETE_AD', `Ad Deleted: ${id}`);

            toast.success('Anúncio removido pelo Admin.');
            setAds(prev => prev.filter(ad => ad.id !== id));
        } catch (error) {
            console.error('Error deleting ad:', error);
            toast.error('Erro ao excluir anúncio.');
        }
    }

    async function toggleFeatured(ad: any) {
        try {
            const newStatus = !ad.featured;
            const { error } = await supabase
                .from('ads')
                .update({ featured: newStatus })
                .eq('id', ad.id);

            if (error) throw error;

            await logAdminAction(user?.email, 'FEATURE_AD', `Ad ${ad.id} featured: ${newStatus}`);

            setAds(prev => prev.map(item =>
                item.id === ad.id ? { ...item, featured: newStatus } : item
            ));

            toast.success(newStatus ? 'Anúncio destacado!' : 'Destaque removido.');
        } catch (error) {
            console.error('Error toggling featured:', error);
            toast.error('Erro ao alterar destaque.');
        }
    }

    function handleExport() {
        const headers = ['ID', 'Título', 'Preço', 'Categoria', 'Vendedor', 'Data', 'Destaque'];
        const csvContent = [
            headers.join(','),
            ...ads.map(ad => [
                ad.id,
                `"${ad.title.replace(/"/g, '""')}"`,
                ad.price,
                ad.category,
                `"${ad.seller?.name || ''}"`,
                ad.publishedAt,
                ad.featured ? 'Sim' : 'Não'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'anuncios_export.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const filteredAds = ads.filter(ad =>
        ad.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ad.seller?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Gerenciar Anúncios</h1>
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar anúncio..."
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Exportar CSV
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
                                <th className="p-4 font-medium">Produto</th>
                                <th className="p-4 font-medium">Preço</th>
                                <th className="p-4 font-medium">Vendedor</th>
                                <th className="p-4 font-medium">Data</th>
                                <th className="p-4 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Carregando...</td></tr>
                            ) : filteredAds.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum anúncio encontrado.</td></tr>
                            ) : (
                                filteredAds.map(ad => (
                                    <tr key={ad.id} className={`hover:bg-gray-50 transition-colors ${ad.featured ? 'bg-yellow-50/50' : ''}`}>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <img src={ad.images?.[0]} alt="" className="w-10 h-10 rounded bg-gray-100 object-cover" />
                                                    {ad.featured && (
                                                        <div className="absolute -top-1 -right-1 bg-yellow-400 text-white rounded-full p-0.5">
                                                            <Star className="w-2 h-2 fill-current" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="max-w-[200px]">
                                                    <p className="font-medium text-gray-900 truncate">{ad.title}</p>
                                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                                        <span className="truncate">{ad.category}</span>
                                                        {ad.featured && <span className="text-yellow-600 font-medium">• Destaque</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-gray-900">{formatPrice(ad.price)}</td>
                                        <td className="p-4 text-sm text-gray-600">
                                            {ad.seller?.name || 'N/A'}
                                            <span className="block text-xs text-gray-400">ID: {ad.seller?.id?.slice(0, 8)}...</span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">{formatDate(ad.publishedAt)}</td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => toggleFeatured(ad)}
                                                    className={`p-2 rounded-lg transition-colors ${ad.featured
                                                        ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100'
                                                        : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100'
                                                        }`}
                                                    title={ad.featured ? "Remover destaque" : "Destacar anúncio"}
                                                >
                                                    <Star className={`w-4 h-4 ${ad.featured ? 'fill-current' : ''}`} />
                                                </button>
                                                <Link to={`/anuncio/${ad.id}`} target='_blank'>
                                                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Ver anúncio">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </Link>
                                                <Link to={`/editar/${ad.id}`}>
                                                    <button className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg" title="Editar anúncio">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(ad.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                    title="Excluir anúncio"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
