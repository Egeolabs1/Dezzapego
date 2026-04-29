import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Bell, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Notification = {
    id: string;
    title: string;
    message: string;
    read: boolean;
    created_at: string;
    user_id: string | null; // null = Global
    user_email?: string; // Loaded via join if possible, or separate query
};

export default function AdminNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [sending, setSending] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [targetUserId, setTargetUserId] = useState('');

    useEffect(() => {
        fetchNotifications();
    }, []);

    async function fetchNotifications() {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setNotifications(data || []);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            toast.error('Erro ao carregar notificações');
        }
    }

    async function handleSend() {
        if (!title.trim() || !message.trim()) return;

        setSending(true);
        try {
            const payload = {
                title,
                message,
                user_id: targetUserId || null, // If empty string, send as GLOBAL (null)
                read: false,
                created_at: new Date().toISOString()
            };

            const { error } = await supabase.from('notifications').insert(payload);
            if (error) throw error;

            toast.success('Notificação enviada com sucesso!');
            setTitle('');
            setMessage('');
            setTargetUserId('');
            fetchNotifications(); // Refresh list
        } catch (error) {
            console.error('Error sending notification:', error);
            toast.error('Erro ao enviar notificação');
        } finally {
            setSending(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Tem certeza que deseja excluir este registro? (Isso não apaga para usuários que já receberam, se for global)')) return;

        try {
            const { error } = await supabase.from('notifications').delete().eq('id', id);
            if (error) throw error;
            toast.success('Registro excluído');
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error('Error deleting:', error);
            toast.error('Erro ao excluir');
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Bell className="w-6 h-6 text-blue-600" />
                Gerenciar Notificações
            </h1>

            {/* Send Form */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Send className="w-5 h-5 text-gray-500" />
                    Enviar Nova Notificação
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ex: Manutenção Programada"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                placeholder="Digite sua mensagem aqui..."
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Destinatário (Opcional)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={targetUserId}
                                    onChange={e => setTargetUserId(e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                    placeholder="UUID do usuário (deixe vazio para TODOS)"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {targetUserId ? 'Enviando para usuário específico.' : 'Enviando para TODOS os usuários (Global).'}
                            </p>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                onClick={handleSend}
                                disabled={sending || !title || !message}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                {sending ? 'Enviando...' : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Enviar Notificação
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800">Histórico de Envios</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium text-xs uppercase">
                            <tr>
                                <th className="px-6 py-3">Título</th>
                                <th className="px-6 py-3">Mensagem</th>
                                <th className="px-6 py-3">Destino</th>
                                <th className="px-6 py-3">Data</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {notifications.map(notification => (
                                <tr key={notification.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{notification.title}</td>
                                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{notification.message}</td>
                                    <td className="px-6 py-4">
                                        {notification.user_id ? (
                                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-mono">
                                                {notification.user_id.slice(0, 8)}...
                                            </span>
                                        ) : (
                                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold uppercase">
                                                Global
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(notification.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(notification.id)}
                                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                            title="Excluir do histórico"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {notifications.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                        Nenhuma notificação enviada ainda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
