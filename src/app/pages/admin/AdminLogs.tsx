import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Shield, Search, User } from 'lucide-react';

export default function AdminLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLogs();
    }, []);

    async function fetchLogs() {
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.admin_email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    function getActionColor(action: string) {
        if (action.includes('DELETE')) return 'text-red-600 bg-red-50';
        if (action.includes('BAN')) return 'text-orange-600 bg-orange-50';
        if (action.includes('FEATURE')) return 'text-yellow-600 bg-yellow-50';
        return 'text-blue-600 bg-blue-50';
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Logs de Auditoria</h1>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar logs..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
                                <th className="p-4 font-medium">Data</th>
                                <th className="p-4 font-medium">Admin</th>
                                <th className="p-4 font-medium">Ação</th>
                                <th className="p-4 font-medium">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-500">Carregando...</td></tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-gray-500">
                                        <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>Nenhum registro encontrado recentement.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 text-sm text-gray-500 whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleString('pt-BR')}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-900">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                                    <User className="w-3 h-3" />
                                                </div>
                                                {log.admin_email}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            {log.details}
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
