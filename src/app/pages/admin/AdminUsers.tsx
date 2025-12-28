import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Loader2, Trash2, Search, ShieldAlert, Download, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';

type SellerStats = {
    id: string;
    name: string;
    count: number;
    email?: string;
    verified?: boolean; // New field derived from one of their ads
};

export default function AdminUsers() {
    const [sellers, setSellers] = useState<SellerStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchSellers();
    }, []);

    async function fetchSellers() {
        try {
            const { data, error } = await supabase
                .from('ads')
                .select('seller');

            if (error) throw error;

            // Group by seller ID
            const sellerMap = new Map<string, SellerStats>();

            data.forEach((row: any) => {
                const seller = row.seller;
                if (!seller || !seller.id) return;

                if (sellerMap.has(seller.id)) {
                    const existing = sellerMap.get(seller.id)!;
                    existing.count++;
                    if (seller.verified) existing.verified = true; // If any ad has verified, assume user is verified
                } else {
                    sellerMap.set(seller.id, {
                        id: seller.id,
                        name: seller.name || 'Desconhecido',
                        count: 1,
                        verified: seller.verified || false
                    });
                }
            });

            setSellers(Array.from(sellerMap.values()));
        } catch (error) {
            console.error('Error fetching sellers:', error);
            toast.error('Erro ao carregar usuários.');
        } finally {
            setLoading(false);
        }
    }

    async function handleBanUser(userId: string) {
        if (!confirm('ATENÇÃO: Isso excluirá TODOS os anúncios deste usuário. Essa ação é irreversível. Continuar?')) return;

        try {
            const { error } = await supabase.from('ads').delete().eq('seller->>id', userId);
            if (error) throw error;
            toast.success('Todos os anúncios do usuário foram removidos.');

            // Update local state - remove user or set count to 0
            setSellers(prev => prev.filter(s => s.id !== userId));
        } catch (error) {
            console.error('Error banning user:', error);
            toast.error('Erro ao banir usuário.');
        }
    }

    async function handleVerifyUser(seller: SellerStats) {
        try {
            const newStatus = !seller.verified;

            // 1. Get all ads from this seller
            const { data: ads, error: fetchError } = await supabase
                .from('ads')
                .select('*')
                .eq('seller->>id', seller.id);

            if (fetchError) throw fetchError;
            if (!ads || ads.length === 0) return;

            // 2. Prepare update promises
            // We have to update each ad because we don't have a users table.
            // In a real app with 'profiles' table, this would be a single update.
            // For performance in this NoSQL-like structure, we'll just update the first 20 to avoid timeouts in MVP
            // or loop all if reasonable.

            const updatePromises = ads.map(ad => {
                const updatedSeller = { ...ad.seller, verified: newStatus };
                return supabase
                    .from('ads')
                    .update({ seller: updatedSeller })
                    .eq('id', ad.id);
            });

            await Promise.all(updatePromises);

            setSellers(prev => prev.map(s =>
                s.id === seller.id ? { ...s, verified: newStatus } : s
            ));

            toast.success(newStatus ? 'Usuário verificado!' : 'Verificação removida.');
        } catch (error) {
            console.error('Error verifying user:', error);
            toast.error('Erro ao alterar verificação.');
        }
    }

    function handleExport() {
        const headers = ['ID', 'Nome', 'Anúncios Ativos', 'Verificado'];
        const csvContent = [
            headers.join(','),
            ...sellers.map(s => [
                s.id,
                `"${s.name.replace(/"/g, '""')}"`,
                s.count,
                s.verified ? 'Sim' : 'Não'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'usuarios_export.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const filteredSellers = sellers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Gerenciar Usuários</h1>
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar usuário..."
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
                                <th className="p-4 font-medium">Usuário</th>
                                <th className="p-4 font-medium">ID do Sistema</th>
                                <th className="p-4 font-medium text-center">Status</th>
                                <th className="p-4 font-medium text-center">Anúncios</th>
                                <th className="p-4 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Carregando...</td></tr>
                            ) : filteredSellers.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum usuário encontrado.</td></tr>
                            ) : (
                                filteredSellers.map(seller => (
                                    <tr key={seller.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-medium text-gray-900">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs relative">
                                                    {seller.name.charAt(0).toUpperCase()}
                                                    {seller.verified && (
                                                        <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 border border-white">
                                                            <BadgeCheck className="w-2 h-2" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{seller.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500 font-mono">{seller.id}</td>
                                        <td className="p-4 text-center">
                                            {seller.verified ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                                    <BadgeCheck className="w-3 h-3" /> Verificado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                    Padrão
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                {seller.count}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleVerifyUser(seller)}
                                                    className={`p-2 rounded-lg transition-colors ${seller.verified
                                                            ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                                                            : 'text-gray-400 hover:text-blue-600 hover:bg-gray-100'
                                                        }`}
                                                    title={seller.verified ? "Remover verificação" : "Verificar usuário"}
                                                >
                                                    <BadgeCheck className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleBanUser(seller.id)}
                                                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1 transition-colors"
                                                    title="Remover todos os anúncios deste usuário"
                                                >
                                                    <ShieldAlert className="w-3 h-3" />
                                                    Banir
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
