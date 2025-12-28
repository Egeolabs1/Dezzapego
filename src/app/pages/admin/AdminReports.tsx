import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Eye, Trash2, CheckCircle, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { formatDate } from '../../../lib/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { logAdminAction } from '../../../lib/adminLogger';

export default function AdminReports() {
    const { user } = useAuth();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

    async function handleResolve(reportId: string, action: 'ban' | 'dismiss') {
        try {
            if (action === 'ban') {
                const report = reports.find(r => r.id === reportId);
                if (report?.ad_id) {
                    await supabase.from('ads').delete().eq('id', report.ad_id);
                    await logAdminAction(user?.email, 'BAN_AD_REPORT', `Ad ${report.ad_id} banned via report ${reportId}`);
                    toast.success('Anúncio banido e removido.');
                }
            } else {
                await logAdminAction(user?.email, 'DISMISS_REPORT', `Report ${reportId} dismissed`);
            }

            // Update report status
            const { error } = await supabase
                .from('reports')
                .update({ status: action === 'ban' ? 'resolved_banned' : 'dismissed' })
                .eq('id', reportId);

            if (error) throw error;

            setReports(prev => prev.map(r =>
                r.id === reportId
                    ? { ...r, status: action === 'ban' ? 'resolved_banned' : 'dismissed' }
                    : r
            ));

            if (action === 'dismiss') toast.success('Denúncia descartada.');

        } catch (error) {
            console.error('Error resolving report:', error);
            toast.error('Erro ao processar denúncia.');
        }
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
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {report.status === 'pending' ? 'Pendente' :
                                                    report.status === 'resolved_banned' ? 'Banido' : 'Descartado'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {report.status === 'pending' && report.ad && (
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link to={`/anuncio/${report.ad.id}`} target="_blank">
                                                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Ver Anúncio">
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    </Link>
                                                    <button
                                                        onClick={() => handleResolve(report.id, 'dismiss')}
                                                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                                                        title="Ignorar Denúncia"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleResolve(report.id, 'ban')}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                        title="Banir Anúncio"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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
        </div>
    );
}
