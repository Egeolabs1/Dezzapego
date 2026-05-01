import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    Search,
    ShieldAlert,
    Download,
    BadgeCheck,
    XCircle,
    Undo2,
    ExternalLink,
    Copy,
    Ban,
    UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Profile } from '../../../types';
import {
    approveProfileVerification,
    parseVerificationDocs,
    rejectProfileVerification,
} from '../../../lib/adminVerification';

type SellerStats = Partial<Profile> & {
    id: string;
    count: number;
    name: string;
};

function csvEscape(value: string | number | boolean | null | undefined): string {
    if (value === null || value === undefined) return '""';
    const s = String(value);
    return `"${s.replace(/"/g, '""')}"`;
}

async function copyText(label: string, text: string) {
    try {
        await navigator.clipboard.writeText(text);
        toast.success(`${label} copiado.`);
    } catch {
        toast.error('Não foi possível copiar.');
    }
}

type TabKey = 'all' | 'pending' | 'verified' | 'rejected' | 'suspended';

export default function AdminUsers() {
    const [sellers, setSellers] = useState<SellerStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<TabKey>('all');
    const [selectedUserDocs, setSelectedUserDocs] = useState<{ doc: string[]; selfie: string[]; name: string } | null>(
        null,
    );

    useEffect(() => {
        fetchSellers();
    }, []);

    async function fetchSellers() {
        try {
            const { data: profiles, error: profilesError } = await supabase.from('profiles').select(
                'id, full_name, email, phone, verified, verification_status, verification_docs, verification_rejection_reason, created_at, signup_ip, last_access_ip, last_access_at, is_suspended, suspended_reason',
            );

            if (profilesError) {
                console.error('Error fetching profiles:', profilesError);
                throw new Error(`Erro ao buscar perfis: ${profilesError.message}`);
            }

            const { data: ads, error: adsError } = await supabase.from('ads').select('id, user_id');

            if (adsError) {
                console.error('Error fetching ads for stats:', adsError);
                toast.error(`Erro ao carregar contagem de anúncios: ${adsError.message}`);
            }

            const adCounts: Record<string, number> = {};
            (ads || []).forEach((ad) => {
                if (ad.user_id) {
                    adCounts[ad.user_id] = (adCounts[ad.user_id] || 0) + 1;
                }
            });

            const stats: SellerStats[] = (profiles || []).map((p) => ({
                ...p,
                name: p.full_name || 'Usuário sem nome',
                count: adCounts[p.id] || 0,
            }));

            setSellers(stats);
        } catch (error: unknown) {
            console.error('Error fetching sellers:', error);
            const msg = error instanceof Error ? error.message : 'Erro ao carregar usuários.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }

    async function handleBanUser(userId: string) {
        if (!confirm('ATENÇÃO: Isso excluirá TODOS os anúncios deste usuário. Essa ação é irreversível. Continuar?'))
            return;

        try {
            const { error } = await supabase.from('ads').delete().eq('user_id', userId);
            if (error) throw error;

            toast.success('Todos os anúncios do usuário foram removidos.');
            setSellers((prev) => prev.map((s) => (s.id === userId ? { ...s, count: 0 } : s)));
        } catch (error) {
            console.error('Error banning user:', error);
            toast.error('Erro ao banir usuário.');
        }
    }

    async function handleSuspendUser(seller: SellerStats) {
        if (seller.is_suspended) return;
        const reason =
            window.prompt(
                'Motivo da suspensão (opcional; pode ser exibido ao usuário após o logout):',
            ) ?? '';
        if (!confirm('Suspender esta conta? O usuário será desconectado e não poderá criar/editar/excluir anúncios.'))
            return;
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    is_suspended: true,
                    suspended_reason: reason.trim() || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', seller.id);

            if (error) throw error;

            setSellers((prev) =>
                prev.map((s) =>
                    s.id === seller.id
                        ? {
                              ...s,
                              is_suspended: true,
                              suspended_reason: reason.trim() || null,
                          }
                        : s,
                ),
            );
            toast.success('Conta suspensa.');
        } catch (error) {
            console.error('Error suspending user:', error);
            toast.error('Erro ao suspender conta.');
        }
    }

    async function handleReactivateUser(seller: SellerStats) {
        if (!seller.is_suspended) return;
        if (!confirm('Reativar esta conta? O usuário poderá voltar a usar anúncios normalmente.')) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    is_suspended: false,
                    suspended_reason: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', seller.id);

            if (error) throw error;

            setSellers((prev) =>
                prev.map((s) =>
                    s.id === seller.id ? { ...s, is_suspended: false, suspended_reason: null } : s,
                ),
            );
            toast.success('Conta reativada.');
        } catch (error) {
            console.error('Error reactivating user:', error);
            toast.error('Erro ao reativar conta.');
        }
    }

    async function handleApproveVerification(seller: SellerStats) {
        if (!seller.verification_status || seller.verification_status !== 'pending') {
            toast.error('Somente solicitações em análise podem ser aprovadas por esta ação.');
            return;
        }
        try {
            await approveProfileVerification(seller.id);

            setSellers((prev) =>
                prev.map((s) =>
                    s.id === seller.id
                        ? {
                              ...s,
                              verified: true,
                              verification_status: 'verified',
                              verification_rejection_reason: null,
                          }
                        : s,
                ),
            );
            toast.success('Conta verificada!');
        } catch (error) {
            console.error('Error approving verification:', error);
            toast.error('Erro ao aprovar verificação.');
        }
    }

    async function handleRejectVerification(seller: SellerStats) {
        const reason =
            window.prompt(
                'Motivo da recusa (o usuário verá esta mensagem). Ex.: documento ilegível, dados não conferem:',
            ) ?? '';
        const trimmed = reason.trim();
        try {
            await rejectProfileVerification(seller.id, trimmed);

            setSellers((prev) =>
                prev.map((s) =>
                    s.id === seller.id
                        ? {
                              ...s,
                              verified: false,
                              verification_status: 'rejected',
                              verification_rejection_reason:
                                  trimmed || 'Documentação não aprovada. Envie fotos mais nítidas.',
                          }
                        : s,
                ),
            );
            toast.success('Solicitação recusada. O usuário pode reenviar documentos.');
        } catch (error) {
            console.error('Error rejecting verification:', error);
            toast.error('Erro ao recusar verificação.');
        }
    }

    async function handleRevokeVerification(seller: SellerStats) {
        if (!seller.verified) return;
        if (!confirm('Remover selo verificado deste usuário?')) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    verified: false,
                    verification_status: 'none',
                    verification_rejection_reason: null,
                })
                .eq('id', seller.id);

            if (error) throw error;

            setSellers((prev) =>
                prev.map((s) =>
                    s.id === seller.id
                        ? { ...s, verified: false, verification_status: 'none', verification_rejection_reason: null }
                        : s,
                ),
            );
            toast.success('Verificação removida.');
        } catch (error) {
            console.error('Error revoking verification:', error);
            toast.error('Erro ao remover verificação.');
        }
    }

    function handleExport() {
        const headers = [
            'id',
            'full_name',
            'email',
            'phone',
            'created_at',
            'signup_ip',
            'last_access_ip',
            'last_access_at',
            'verification_status',
            'verified',
            'is_suspended',
            'suspended_reason',
            'ad_count',
        ];
        const rows = sellers.map((s) =>
            [
                csvEscape(s.id),
                csvEscape(s.name),
                csvEscape(s.email ?? ''),
                csvEscape(s.phone ?? ''),
                csvEscape(s.created_at ?? ''),
                csvEscape(s.signup_ip ?? ''),
                csvEscape(s.last_access_ip ?? ''),
                csvEscape(s.last_access_at ?? ''),
                csvEscape(s.verification_status ?? ''),
                csvEscape(s.verified ? 'true' : 'false'),
                csvEscape(s.is_suspended ? 'true' : 'false'),
                csvEscape(s.suspended_reason ?? ''),
                csvEscape(s.count),
            ].join(','),
        );
        const csvContent = [headers.join(','), ...rows].join('\n');

        const blob = new Blob(['\ufeff', csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'usuarios_export.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    const q = searchTerm.toLowerCase().trim();
    const baseFiltered = sellers.filter(
        (s) =>
            s.name.toLowerCase().includes(q) ||
            s.id.toLowerCase().includes(q) ||
            (s.email && s.email.toLowerCase().includes(q)),
    );

    const filteredSellers =
        activeTab === 'all'
            ? baseFiltered
            : activeTab === 'pending'
              ? baseFiltered.filter((s) => s.verification_status === 'pending')
              : activeTab === 'verified'
                ? baseFiltered.filter((s) => s.verification_status === 'verified' || s.verified === true)
                : activeTab === 'rejected'
                  ? baseFiltered.filter((s) => s.verification_status === 'rejected')
                  : baseFiltered.filter((s) => s.is_suspended === true);

    const tabCount = (key: TabKey) => {
        if (key === 'all') return sellers.length;
        if (key === 'pending') return sellers.filter((s) => s.verification_status === 'pending').length;
        if (key === 'verified')
            return sellers.filter((s) => s.verification_status === 'verified' || s.verified === true).length;
        if (key === 'rejected') return sellers.filter((s) => s.verification_status === 'rejected').length;
        return sellers.filter((s) => s.is_suspended === true).length;
    };

    const tabs: { key: TabKey; label: string }[] = [
        { key: 'all', label: 'Todos' },
        { key: 'pending', label: 'Pendentes verificação' },
        { key: 'verified', label: 'Verificados' },
        { key: 'rejected', label: 'Recusados' },
        { key: 'suspended', label: 'Suspensos' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Gerenciar Usuários</h1>
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar nome, e-mail ou UUID..."
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleExport}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Exportar CSV
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap gap-1 border-b border-gray-200 overflow-x-auto">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => setActiveTab(t.key)}
                        className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                            activeTab === t.key
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {t.label} ({tabCount(t.key)})
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
                                <th className="p-4 font-medium">Usuário</th>
                                <th className="p-4 font-medium">Contato / ID</th>
                                <th className="p-4 font-medium text-center">Status</th>
                                <th className="p-4 font-medium text-center">Anúncios</th>
                                <th className="p-4 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        Carregando...
                                    </td>
                                </tr>
                            ) : filteredSellers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        Nenhum usuário encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredSellers.map((seller) => (
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
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate">{seller.name}</p>
                                                    {seller.is_suspended && (
                                                        <p className="text-xs text-red-600 font-medium">Conta suspensa</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            <p className="truncate max-w-[200px]" title={seller.email ?? ''}>
                                                {seller.email || '—'}
                                            </p>
                                            <p className="font-mono text-xs text-gray-400 truncate max-w-[220px]">
                                                {seller.id}
                                            </p>
                                        </td>
                                        <td className="p-4 text-center">
                                            {seller.is_suspended ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    <Ban className="w-3 h-3" />
                                                    Suspenso
                                                </span>
                                            ) : seller.verified ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                                    <BadgeCheck className="w-3 h-3" /> Verificado
                                                </span>
                                            ) : seller.verification_status === 'pending' ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        Em análise
                                                    </span>
                                                    {(() => {
                                                        const { doc, selfie } = parseVerificationDocs(
                                                            seller.verification_docs,
                                                        );
                                                        if (doc.length || selfie.length) {
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setSelectedUserDocs({
                                                                            doc,
                                                                            selfie,
                                                                            name: seller.name,
                                                                        })
                                                                    }
                                                                    className="text-xs text-blue-600 underline hover:text-blue-800"
                                                                >
                                                                    Ver documentos
                                                                </button>
                                                            );
                                                        }
                                                        return (
                                                            <span className="text-[10px] text-amber-600">
                                                                Sem anexos
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            ) : seller.verification_status === 'rejected' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    Recusado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                    Não solicitado
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                {seller.count}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1 flex-wrap">
                                                <a
                                                    href={`/anunciante/${seller.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 rounded-lg text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors inline-flex"
                                                    title="Perfil público"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                                {seller.email && (
                                                    <button
                                                        type="button"
                                                        onClick={() => copyText('E-mail', seller.email!)}
                                                        className="p-2 rounded-lg text-gray-700 bg-gray-50 hover:bg-gray-100"
                                                        title="Copiar e-mail"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => copyText('UUID', seller.id)}
                                                    className="p-2 rounded-lg text-gray-700 bg-gray-50 hover:bg-gray-100"
                                                    title="Copiar UUID"
                                                >
                                                    <span className="text-[10px] font-mono px-0.5">ID</span>
                                                </button>
                                                {seller.verification_status === 'pending' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleApproveVerification(seller)}
                                                            className="p-2 rounded-lg text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                                                            title="Aprovar verificação"
                                                        >
                                                            <BadgeCheck className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRejectVerification(seller)}
                                                            className="p-2 rounded-lg text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                                                            title="Recusar verificação"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                                {seller.verified && !seller.is_suspended && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRevokeVerification(seller)}
                                                        className="p-2 rounded-lg text-orange-800 bg-orange-50 hover:bg-orange-100 transition-colors"
                                                        title="Revogar selo verificado"
                                                    >
                                                        <Undo2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {!seller.is_suspended ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSuspendUser(seller)}
                                                        className="p-2 rounded-lg text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors"
                                                        title="Suspender conta"
                                                    >
                                                        <Ban className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReactivateUser(seller)}
                                                        className="p-2 rounded-lg text-green-800 bg-green-50 hover:bg-green-100 transition-colors"
                                                        title="Reativar conta"
                                                    >
                                                        <UserCheck className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleBanUser(seller.id)}
                                                    className="px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1 transition-colors"
                                                    title="Remover todos os anúncios deste usuário"
                                                >
                                                    <ShieldAlert className="w-3 h-3" />
                                                    Banir anúncios
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

            {selectedUserDocs && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
                    onClick={() => setSelectedUserDocs(null)}
                >
                    <div
                        className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Documentos de {selectedUserDocs.name}</h2>
                            <button
                                type="button"
                                onClick={() => setSelectedUserDocs(null)}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                &times;
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-semibold mb-2">Documento (RG/CNH)</h3>
                                {selectedUserDocs.doc?.length ? (
                                    selectedUserDocs.doc.map((url, i) => (
                                        <img
                                            key={`${url}-${i}`}
                                            src={url}
                                            alt=""
                                            className="w-full max-h-80 object-contain rounded-lg border border-gray-200 mb-2"
                                        />
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500">Nenhuma imagem de documento.</p>
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold mb-2">Selfie com documento</h3>
                                {selectedUserDocs.selfie?.length ? (
                                    selectedUserDocs.selfie.map((url, i) => (
                                        <img
                                            key={`${url}-${i}`}
                                            src={url}
                                            alt=""
                                            className="w-full max-h-80 object-contain rounded-lg border border-gray-200 mb-2"
                                        />
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500">Nenhuma selfie enviada.</p>
                                )}
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setSelectedUserDocs(null)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
