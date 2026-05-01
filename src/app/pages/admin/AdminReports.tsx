import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Eye, Trash2, CheckCircle, Flag, UserX, Ban } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { formatDate } from '../../../lib/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { logAdminAction } from '../../../lib/adminLogger';

export default function AdminReports() {
    const { user } = useAuth();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isBlockingModalOpen, setIsBlockingModalOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [blockReason, setBlockReason] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [blockAction, setBlockAction] = useState<'ban' | 'block_owner' | null>(null);

    const PREDEFINED_REASONS = [
        'Fraude ou tentativa de golpe',
        'Conteúdo impróprio ou ofensivo',
        'Venda de produtos proibidos',
        'Múltiplas denúncias de usuários',
        'Informações falsas no anúncio',
        'Spam ou comportamento abusivo'
    ];

    useEffect(() => {
        fetchReports();
    }, []);

    async function fetchReports() {
        try {
            // Using a left join simulation since we might not have the foreign key setup perfect in user's DB yet
            // But ideally: select *, ads(*)
            const { data, error } = await supabase
                .from('reports')
                .select(`
                    *,
                    ad:ads(*)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReports(data || []);
        } catch (error) {
            console.error('Error fetching reports:', error);
            // Don't show error toast immediately as the table might not exist yet
        } finally {
            setLoading(false);
        }
    }

    async function handleResolve(reportId: string, action: 'ban' | 'dismiss' | 'block_owner') {
        const report = reports.find(r => r.id === reportId);
        if (!report) return;

        if (action === 'dismiss') {
            try {
                await logAdminAction(user?.email, 'DISMISS_REPORT', `Report ${reportId} dismissed`);
                await updateReportStatus(reportId, 'dismissed');
                toast.success('Denúncia descartada.');
            } catch (error) {
                console.error('Error dismissing report:', error);
                toast.error('Erro ao descartar denúncia.');
            }
            return;
        }

        // For ban or block_owner, open the reason modal
        setSelectedReport(report);
        setBlockAction(action);
        setIsBlockingModalOpen(true);
        setBlockReason('');
        setCustomReason('');
    }

    async function confirmBlock() {
        if (!selectedReport || !blockAction) return;
        const reason = blockReason === 'Outro' ? customReason : blockReason;
        if (!reason) {
            toast.error('Selecione ou digite um motivo.');
            return;
        }

        try {
            if (blockAction === 'ban') {
                // Suspend the specific ad
                await supabase.from('ads').update({ status: 'suspended' }).eq('id', selectedReport.ad_id);
                
                // Notify the user
                await supabase.from('notifications').insert({
                    user_id: selectedReport.ad?.user_id,
                    title: 'Seu anúncio foi suspenso',
                    message: `O anúncio "${selectedReport.ad?.title}" foi suspenso pelo seguinte motivo: ${reason}. Você tem direito a resposta via suporte.`,
                    read: false,
                    created_at: new Date().toISOString()
                });

                await logAdminAction(user?.email, 'BAN_AD_REPORT', `Ad ${selectedReport.ad_id} suspended via report ${selectedReport.id}. Reason: ${reason}`);
                await updateReportStatus(selectedReport.id, 'resolved_banned');
                toast.success('Anúncio suspenso e usuário notificado.');
            } else if (blockAction === 'block_owner') {
                const ownerId = selectedReport.ad?.user_id;
                if (ownerId) {
                    // Suspend the profile
                    await supabase
                        .from('profiles')
                        .update({ 
                            is_suspended: true,
                            suspended_reason: reason
                        })
                        .eq('id', ownerId);

                    // Suspend ALL ads from this user
                    await supabase.from('ads').update({ status: 'suspended' }).eq('user_id', ownerId);
                    
                    // Notify the user
                    await supabase.from('notifications').insert({
                        user_id: ownerId,
                        title: 'Sua conta foi suspensa',
                        message: `Sua conta e todos os seus anúncios foram suspensos pelo seguinte motivo: ${reason}. Você pode entrar em contato com o suporte para contestar.`,
                        read: false,
                        created_at: new Date().toISOString()
                    });

                    await logAdminAction(user?.email, 'BLOCK_USER_REPORT', `User ${ownerId} blocked via report ${selectedReport.id}. Reason: ${reason}`);
                    await updateReportStatus(selectedReport.id, 'resolved_user_blocked');
                    toast.success('Usuário bloqueado, anúncios suspensos e notificação enviada.');
                }
            }

            setIsBlockingModalOpen(false);
        } catch (error) {
            console.error('Error confirming block:', error);
            toast.error('Erro ao processar ação.');
        }
    }

    async function updateReportStatus(reportId: string, status: string) {
        const { error } = await supabase
            .from('reports')
            .update({ status })
            .eq('id', reportId);

        if (error) throw error;

        setReports(prev => prev.map(r =>
            r.id === reportId ? { ...r, status } : r
        ));
    }

    if (loading) return <div className="p-8">Carregando denúncias...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Denúncias</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
                                <th className="p-4 font-medium">Motivo</th>
                                <th className="p-4 font-medium">Denunciante</th>
                                <th className="p-4 font-medium">Anúncio Denunciado</th>
                                <th className="p-4 font-medium">Data</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {reports.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-3 text-gray-500">
                                            <Flag className="w-8 h-8 opacity-20" />
                                            <p>Nenhuma denúncia encontrada.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                reports.map(report => (
                                    <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <span className="font-medium text-red-600 bg-red-50 px-2 py-1 rounded text-xs">
                                                {report.reason}
                                            </span>
                                            {report.description && (
                                                <p className="text-xs text-gray-500 mt-1 max-w-[200px] truncate">
                                                    "{report.description}"
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm">
                                                <p className="font-medium text-gray-900">{report.reporter_name || 'N/A'}</p>
                                                <p className="text-xs text-gray-500">{report.reporter_email || 'N/A'}</p>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {report.ad ? (
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={report.ad.images?.[0]}
                                                        alt=""
                                                        className="w-8 h-8 rounded bg-gray-100 object-cover"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 max-w-[150px] truncate">
                                                            {report.ad.title}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            ID: {report.ad.id.slice(0, 8)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic">Anúncio não encontrado (Deletado)</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">
                                            {formatDate(report.created_at)}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${report.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                report.status === 'resolved_banned' ? 'bg-red-100 text-red-700' :
                                                report.status === 'resolved_user_blocked' ? 'bg-black text-white' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {report.status === 'pending' ? 'Pendente' :
                                                    report.status === 'resolved_banned' ? 'Anúncio Banido' : 
                                                    report.status === 'resolved_user_blocked' ? 'Dono Bloqueado' :
                                                    'Descartada'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {report.status === 'pending' && report.ad && (
                                                <div className="flex flex-wrap items-center justify-end gap-2">
                                                    <Link to={`/anuncio/${report.ad.id}`} target="_blank">
                                                        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors" title="Ver Anúncio">
                                                            <Eye className="w-3.5 h-3.5" />
                                                            Ver
                                                        </button>
                                                    </Link>
                                                    
                                                    <button
                                                        onClick={() => handleResolve(report.id, 'dismiss')}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
                                                        title="Ignorar Denúncia"
                                                    >
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        Ignorar
                                                    </button>

                                                    <button
                                                        onClick={() => handleResolve(report.id, 'ban')}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                                                        title="Banir Anúncio"
                                                    >
                                                        <Ban className="w-3.5 h-3.5" />
                                                        Bloquear Anúncio
                                                    </button>

                                                    <button
                                                        onClick={() => handleResolve(report.id, 'block_owner')}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-black rounded-lg transition-colors shadow-sm"
                                                        title="Bloquear Usuário"
                                                    >
                                                        <UserX className="w-3.5 h-3.5" />
                                                        Bloquear Dono
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Blocking Reason Modal */}
            {isBlockingModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900">
                                {blockAction === 'ban' ? 'Suspender Anúncio' : 'Bloquear Proprietário'}
                            </h3>
                            <button onClick={() => setIsBlockingModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                                {blockAction === 'block_owner' 
                                    ? 'Isso suspenderá a conta do usuário e TODOS os seus anúncios. O usuário será notificado e poderá contestar.'
                                    : 'Isso suspenderá este anúncio específico. O usuário será notificado.'}
                            </p>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Motivo da Suspensão</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {PREDEFINED_REASONS.map(reason => (
                                        <button
                                            key={reason}
                                            onClick={() => setBlockReason(reason)}
                                            className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-all ${
                                                blockReason === reason 
                                                ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium' 
                                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                            }`}
                                        >
                                            {reason}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setBlockReason('Outro')}
                                        className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-all ${
                                            blockReason === 'Outro' 
                                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium' 
                                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                        }`}
                                    >
                                        Outro motivo...
                                    </button>
                                </div>
                            </div>

                            {blockReason === 'Outro' && (
                                <textarea
                                    value={customReason}
                                    onChange={e => setCustomReason(e.target.value)}
                                    placeholder="Descreva o motivo detalhadamente para o usuário..."
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
                                />
                            )}
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setIsBlockingModalOpen(false)}
                                className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmBlock}
                                className={`flex-1 px-4 py-2.5 text-white rounded-xl font-semibold shadow-md transition-all ${
                                    blockAction === 'block_owner' ? 'bg-black hover:bg-gray-800' : 'bg-red-600 hover:bg-red-700'
                                }`}
                            >
                                Confirmar e Notificar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
