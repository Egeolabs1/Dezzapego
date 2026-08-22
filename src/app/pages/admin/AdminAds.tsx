import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { formatPrice, formatDate } from '../../../lib/formatters';
import { Trash2, Edit, Eye, Search, Star, Download, CheckCircle, XCircle, Clock, CheckSquare } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { logAdminAction } from '../../../lib/adminLogger';

type AdStatus = 'pending' | 'active' | 'rejected';

const STATUS_TABS: { key: AdStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'pending', label: 'Pendentes', icon: <Clock className="w-4 h-4" />, color: 'text-amber-600' },
    { key: 'active', label: 'Ativos', icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-600' },
    { key: 'rejected', label: 'Rejeitados', icon: <XCircle className="w-4 h-4" />, color: 'text-red-600' },
];

const STATUS_BADGE: Record<AdStatus, string> = {
    pending: 'bg-amber-100 text-amber-700',
    active: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
};

const STATUS_LABEL: Record<AdStatus, string> = {
    pending: 'Pendente',
    active: 'Ativo',
    rejected: 'Rejeitado',
};

export default function AdminAds() {
    const { user } = useAuth();
    type AdRecord = {
        id: string;
        title: string;
        description: string;
        price: number;
        category: string;
        subcategory: string;
        status: string;
        featured: boolean;
        images: string[];
        created_at: string;
        user_id: string;
        views: number;
        moderation_rejection_reason?: string | null;
        location?: { state?: string; city?: string };
        seller?: { id?: string; name?: string };
    };
    const [ads, setAds] = useState<AdRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<AdStatus>('pending');
    const [counts, setCounts] = useState<Record<AdStatus, number>>({ pending: 0, active: 0, rejected: 0 });
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        fetchAds();
    }, []);

    async function fetchAds() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('ads')
                .select('id, title, description, price, category, subcategory, status, featured, images, created_at, user_id, views, location, seller, moderation_rejection_reason')
                .order('created_at', { ascending: false })
                .range(0, 99);

            if (error) throw error;
            const all = data || [];
            setAds(all);
            setCounts({
                pending: all.filter(a => a.status === 'pending').length,
                active: all.filter(a => a.status === 'active').length,
                rejected: all.filter(a => a.status === 'rejected').length,
            });
        } catch (error) {
            toast.error('Erro ao carregar anúncios.');
        } finally {
            setLoading(false);
        }
    }

    async function changeStatus(id: string, newStatus: AdStatus, reason = '') {
        try {
            const ad = ads.find((item) => item.id === id);
            const { error } = await supabase.from('ads').update({ status: newStatus, moderation_rejection_reason: newStatus === 'rejected' ? reason : null }).eq('id', id);
            if (error) throw error;
            if (ad?.user_id) {
                await supabase.from('notifications').insert({
                    user_id: ad.user_id,
                    title: newStatus === 'active' ? 'Anúncio aprovado' : 'Anúncio rejeitado',
                    message: newStatus === 'active'
                        ? `Seu anúncio "${ad.title}" já está visível para os compradores.`
                        : `Seu anúncio "${ad.title}" precisa de ajustes antes de ser publicado. Motivo: ${reason || 'Revise as informações e fotos.'}`,
                    type: 'ad_moderation',
                    read: false,
                });
                const { data: session } = await supabase.auth.getSession();
                if (session.session?.access_token) void fetch('/api/admin/notify-ad-status', { method: 'POST', headers: { Authorization: `Bearer ${session.session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: ad.user_id, adId: ad.id, title: ad.title, status: newStatus }) });
            }
            await logAdminAction(user?.email, 'UPDATE_AD_STATUS', `Ad ${id} → ${newStatus}`);
            setAds(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
            setCounts(prev => {
                const old = ads.find(a => a.id === id)?.status as AdStatus | undefined;
                if (!old) return prev;
                return { ...prev, [old]: prev[old] - 1, [newStatus]: prev[newStatus] + 1 };
            });
            toast.success(newStatus === 'active' ? 'Anúncio aprovado!' : 'Anúncio rejeitado.');
        } catch {
            toast.error('Erro ao atualizar status.');
        }
    }

    async function changeSelectedStatus(newStatus: AdStatus) {
        if (!selectedIds.length) return;
        const targets = ads.filter((ad) => selectedIds.includes(ad.id));
        const reason = newStatus === 'rejected' ? (window.prompt('Informe o motivo da rejeição para os anúncios selecionados:') || '').trim() : '';
        if (newStatus === 'rejected' && !reason) { toast.error('Informe um motivo para rejeitar.'); return; }
        const { error } = await supabase.from('ads').update({ status: newStatus, moderation_rejection_reason: newStatus === 'rejected' ? reason : null }).in('id', selectedIds);
        if (error) { toast.error('Não foi possível atualizar os anúncios selecionados.'); return; }
        await Promise.all(targets.filter((ad) => ad.user_id).map((ad) => supabase.from('notifications').insert({ user_id: ad.user_id, title: newStatus === 'active' ? 'Anúncio aprovado' : 'Anúncio rejeitado', message: `Seu anúncio "${ad.title}" foi ${newStatus === 'active' ? 'aprovado' : `rejeitado. Motivo: ${reason}`}.`, type: 'ad_moderation', read: false })));
        setAds((prev) => prev.map((ad) => selectedIds.includes(ad.id) ? { ...ad, status: newStatus } : ad));
        setSelectedIds([]);
        await fetchAds();
        toast.success(`${targets.length} anúncio(s) atualizado(s).`);
    }

    async function handleDelete(id: string) {
        if (!confirm('Excluir este anúncio permanentemente?')) return;
        try {
            const { error } = await supabase.from('ads').delete().eq('id', id);
            if (error) throw error;
            await logAdminAction(user?.email, 'DELETE_AD', `Ad Deleted: ${id}`);
            toast.success('Anúncio removido.');
            setAds(prev => prev.filter(a => a.id !== id));
        } catch {
            toast.error('Erro ao excluir anúncio.');
        }
    }

    async function toggleFeatured(ad: { id: string; featured: boolean }) {
        const newFeatured = !ad.featured;
        try {
            const { error } = await supabase.from('ads').update({ featured: newFeatured }).eq('id', ad.id);
            if (error) throw error;
            await logAdminAction(user?.email, 'FEATURE_AD', `Ad ${ad.id} featured: ${newFeatured}`);
            setAds(prev => prev.map(a => a.id === ad.id ? { ...a, featured: newFeatured } : a));
            toast.success(newFeatured ? 'Anúncio destacado!' : 'Destaque removido.');
        } catch {
            toast.error('Erro ao alterar destaque.');
        }
    }

    function handleExport() {
        const headers = ['ID', 'Título', 'Preço', 'Categoria', 'Vendedor', 'Status', 'Data'];
        const csvContent = [
            headers.join(','),
            ...ads.map(ad => [
                ad.id,
                `"${(ad.title || '').replace(/"/g, '""')}"`,
                ad.price,
                ad.category,
                `"${ad.seller?.name || ''}"`,
                ad.status || 'active',
                ad.created_at,
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'anuncios_export.csv';
        link.click();
    }

    const tabAds = ads.filter(ad => (ad.status || 'active') === activeTab);
    const filteredAds = tabAds.filter(ad =>
        (ad.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ad.seller?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
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

            {/* Status Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === tab.key
                                ? 'border-blue-600 text-blue-700'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <span className={activeTab === tab.key ? 'text-blue-600' : tab.color}>{tab.icon}</span>
                        {tab.label}
                        <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                            activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                            {counts[tab.key]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Pending alert */}
            {activeTab === 'pending' && counts.pending > 0 && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span><strong>{counts.pending} anúncio{counts.pending > 1 ? 's' : ''}</strong> aguardando moderação. Revise e aprove ou rejeite.</span>
                </div>
            )}

            {activeTab === 'pending' && selectedIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <CheckSquare className="h-4 w-4 text-blue-700" />
                    <span className="text-sm font-medium text-blue-900">{selectedIds.length} selecionado(s)</span>
                    <button onClick={() => void changeSelectedStatus('active')} className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">Aprovar selecionados</button>
                    <button onClick={() => void changeSelectedStatus('rejected')} className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">Rejeitar selecionados</button>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
                                <th className="p-4 font-medium"><input aria-label="Selecionar todos os anúncios visíveis" type="checkbox" checked={filteredAds.length > 0 && filteredAds.every((ad) => selectedIds.includes(ad.id))} onChange={(event) => setSelectedIds(event.target.checked ? filteredAds.map((ad) => ad.id) : [])} /></th>
                                <th className="p-4 font-medium">Produto</th>
                                <th className="p-4 font-medium">Preço</th>
                                <th className="p-4 font-medium">Vendedor</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium">Data</th>
                                <th className="p-4 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">Carregando...</td></tr>
                            ) : filteredAds.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">
                                    {activeTab === 'pending' ? 'Nenhum anúncio pendente. ✅' : 'Nenhum anúncio encontrado.'}
                                </td></tr>
                            ) : (
                                filteredAds.map(ad => {
                                    const status = (ad.status || 'active') as AdStatus;
                                    return (
                                        <tr key={ad.id} className={`hover:bg-gray-50 transition-colors ${ad.featured ? 'bg-yellow-50/30' : ''}`}>
                                            <td className="p-4"><input aria-label={`Selecionar ${ad.title}`} type="checkbox" checked={selectedIds.includes(ad.id)} onChange={(event) => setSelectedIds((prev) => event.target.checked ? [...new Set([...prev, ad.id])] : prev.filter((id) => id !== ad.id))} /></td>
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
                                                        <p className="text-xs text-gray-400 truncate">{ad.category}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm font-medium text-gray-900">{formatPrice(ad.price)}</td>
                                            <td className="p-4 text-sm text-gray-600">
                                                {ad.seller?.name || 'N/A'}
                                                <span className="block text-xs text-gray-400">ID: {ad.seller?.id?.slice(0, 8)}...</span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[status]}`}>
                                                    {STATUS_LABEL[status]}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-gray-500">{formatDate(ad.created_at)}</td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    {status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => changeStatus(ad.id, 'active')}
                                                                className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                                                                title="Aprovar anúncio"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => { const reason = window.prompt('Informe o motivo da rejeição:')?.trim(); if (reason) void changeStatus(ad.id, 'rejected', reason); }}
                                                                className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Rejeitar anúncio"
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {status === 'rejected' && (
                                                        <button
                                                            onClick={() => changeStatus(ad.id, 'active')}
                                                            className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                                                            title="Reativar anúncio"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {status === 'active' && (
                                                        <button
                                                            onClick={() => toggleFeatured(ad)}
                                                            className={`p-2 rounded-lg transition-colors ${ad.featured
                                                                ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100'
                                                                : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100'
                                                            }`}
                                                            title={ad.featured ? 'Remover destaque' : 'Destacar anúncio'}
                                                        >
                                                            <Star className={`w-4 h-4 ${ad.featured ? 'fill-current' : ''}`} />
                                                        </button>
                                                    )}
                                                    <Link href={`/anuncio/${ad.id}`} target="_blank">
                                                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Ver anúncio">
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    </Link>
                                                    <Link href={`/editar/${ad.id}`}>
                                                        <button className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg" title="Editar">
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(ad.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
