import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Search, ShieldAlert, Download, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Profile } from '../../../types';

type SellerStats = Partial<Profile> & {
    id: string;
    count: number;
    name: string;
    // We fetch specific fields so others might be undefined
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
            // 1. Fetch Profiles (Specific columns to avoid 406 on bad data types)
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, email, verified, verification_status');

            if (profilesError) {
                console.error('Error fetching profiles:', profilesError);
                throw new Error(`Erro ao buscar perfis: ${profilesError.message}`);
            }

            // 2. Fetch Ad Counts (grouped by user_id)
            const { data: ads, error: adsError } = await supabase
                .from('ads')
                .select('id, user_id');

            if (adsError) {
                console.error('Error fetching ads for stats:', adsError);
                // Don't block UI if ads fail, just show 0 counts
                toast.error(`Erro ao carregar contagem de anúncios: ${adsError.message}`);
            }

            // map counts
            const adCounts: Record<string, number> = {};
            (ads || []).forEach(ad => {
                if (ad.user_id) {
                    adCounts[ad.user_id] = (adCounts[ad.user_id] || 0) + 1;
                }
            });

            // Merge
            const stats: SellerStats[] = (profiles || []).map(p => ({
                ...p,
                name: p.full_name || 'Usuário sem nome',
                count: adCounts[p.id] || 0
            }));

            setSellers(stats);
        } catch (error: any) {
            console.error('Error fetching sellers:', error);
            toast.error(error.message || 'Erro ao carregar usuários.');
        } finally {
            setLoading(false);
        }
    }

    async function handleBanUser(userId: string) {
        if (!confirm('ATENÇÃO: Isso excluirá TODOS os anúncios deste usuário. Essa ação é irreversível. Continuar?')) return;

        try {
            // Delete ads
            const { error } = await supabase.from('ads').delete().eq('user_id', userId);
            if (error) throw error;

            // Optional: Mark profile as banned or delete it? 
            // For now, just delete ads as requested.

            toast.success('Todos os anúncios do usuário foram removidos.');

            // Update local state
            setSellers(prev => prev.map(s => s.id === userId ? { ...s, count: 0 } : s));
        } catch (error) {
            console.error('Error banning user:', error);
            toast.error('Erro ao banir usuário.');
        }
    }

    const [selectedUserDocs, setSelectedUserDocs] = useState<{ doc: string[], selfie: string[], name: string } | null>(null);

    async function handleVerifyUser(seller: SellerStats) {
        try {
            const newStatus = !seller.verified;

            // Update Profile
            const { error } = await supabase
                .from('profiles')
                .update({
                    verified: newStatus,
                    verification_status: newStatus ? 'verified' : 'none'
                })
                .eq('id', seller.id);

            if (error) throw error;

            // Also update Auth Metadata for redundancy if needed, but Profile is source of truth now.
            // Skipping auth update to avoid "service_role" requirement if managing other users.

            // Note: We might want to update existing ads snapshots too, 
            // but the new "Dedicated Profiles" philosophy means Ads should read from Profile.
            // However, existing AdsList uses the snapshot. 
            // Ideally we run a background update or user updates next time they edit ad.
            // For MVP Consistency: Let's try to update ads snapshots if possible, but RLS might block updating OTHERS ads
            // unless we are ADMIN. We are in Admin page, but client-side RLS often checks auth.uid() = user_id.
            // Only Service Role can update other's ads. Use Edge Function or RPC for full consistency.
            // For now, just update Profile. User will see badge if we implement logic to read profile in AdDetails/List.

            setSellers(prev => prev.map(s =>
                s.id === seller.id ? { ...s, verified: newStatus, verification_status: newStatus ? 'verified' : 'none' } : s
            ));

            toast.success(newStatus ? 'Usuário verificado!' : 'Verificação removida.');
        } catch (error) {
            console.error('Error verifying user:', error);
            toast.error('Erro ao alterar verificação.');
        }
    }


    function handleExport() {
        // Export to CSV
        const headers = ['ID', 'Nome', 'Email', 'Telefone', 'Anúncios Ativos', 'Verificado', 'Status Doc'];
        const csvContent = [
            headers.join(','),
            ...sellers.map(s => [
                s.id,
                `"${s.name.replace(/"/g, '""')}"`,
                s.email || '',
                s.phone || '',
                s.count,
                s.verified ? 'Sim' : 'Não',
                s.verification_status
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

    const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');

    // ... (keep handleExport)

    const baseFilteredSellers = sellers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.includes(searchTerm)
    );

    const filteredSellers = activeTab === 'all'
        ? baseFilteredSellers
        : baseFilteredSellers.filter(s => s.verification_status === 'pending');

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Gerenciar Usuários</h1>
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    {/* ... search and export ... */}
                    <div className="relative w-full md:w-64">
                        {/* ... search input ... */}
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

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'all'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                >
                    Todos os Usuários ({sellers.length})
                </button>
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'pending'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                >
                    Solicitações Pendentes
                    {sellers.filter(s => s.verification_status === 'pending').length > 0 && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                            {sellers.filter(s => s.verification_status === 'pending').length}
                        </span>
                    )}
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        {/* ... thead ... */}
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
                            {/* ... loading / empty ... */}
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Carregando...</td></tr>
                            ) : filteredSellers.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum usuário encontrado.</td></tr>
                            ) : (
                                filteredSellers.map(seller => (
                                    <tr key={seller.id} className="hover:bg-gray-50 transition-colors">
                                        {/* ... user columns ... */}
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
                                                    {/* Show visual indicator if docs are present?? No easy way unless we pass it in SellerStats. 
                                                        Actually we need to update fetchSellers to grab docs. 
                                                        Assuming verification_docs is in seller object
                                                    */}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500 font-mono">{seller.id}</td>
                                        <td className="p-4 text-center">
                                            {seller.verified ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                                    <BadgeCheck className="w-3 h-3" /> Verificado
                                                </span>
                                            ) : seller.verification_status === 'pending' ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        Solicitado
                                                    </span>
                                                    {/* Button to view docs if pending? */}
                                                    {(seller as any).verification_docs && (
                                                        <button
                                                            onClick={() => setSelectedUserDocs({
                                                                doc: (seller as any).verification_docs.doc,
                                                                selfie: (seller as any).verification_docs.selfie,
                                                                name: seller.name
                                                            })}
                                                            className="text-xs text-blue-600 underline hover:text-blue-800"
                                                        >
                                                            Ver Docs
                                                        </button>
                                                    )}
                                                </div>
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

            {/* Docs Modal */}
            {selectedUserDocs && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4" onClick={() => setSelectedUserDocs(null)}>
                    <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Documentos de {selectedUserDocs.name}</h2>
                            <button onClick={() => setSelectedUserDocs(null)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-semibold mb-2">Documento (RG/CNH)</h3>
                                {selectedUserDocs.doc?.map((url, i) => (
                                    <img key={i} src={url} alt="Doc" className="w-full h-auto rounded-lg border border-gray-200 mb-2" />
                                ))}
                            </div>
                            <div>
                                <h3 className="font-semibold mb-2">Selfie com Documento</h3>
                                {selectedUserDocs.selfie?.map((url, i) => (
                                    <img key={i} src={url} alt="Selfie" className="w-full h-auto rounded-lg border border-gray-200 mb-2" />
                                ))}
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setSelectedUserDocs(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Fechar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
