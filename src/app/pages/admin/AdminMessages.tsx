import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Mail, Loader2, CheckCircle, Clock, Trash2, Search, User } from 'lucide-react';
import { toast } from 'sonner';

interface ContactMessage {
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    read: boolean;
    created_at: string;
}

export default function AdminMessages() {
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('contacts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                toast.error('Erro ao carregar mensagens.');
                console.error(error);
            } else {
                setMessages(data || []);
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
            toast.error('Erro ao carregar mensagens.');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('contacts')
            .update({ read: !currentStatus })
            .eq('id', id);

        if (error) {
            toast.error('Erro ao atualizar status.');
        } else {
            setMessages(prev => prev.map(msg =>
                msg.id === id ? { ...msg, read: !currentStatus } : msg
            ));
            toast.success(currentStatus ? 'Marcada como não lida.' : 'Marcada como lida.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja apagar esta mensagem?')) return;

        const { error } = await supabase
            .from('contacts')
            .delete()
            .eq('id', id);

        if (error) {
            toast.error('Erro ao apagar mensagem.');
        } else {
            setMessages(prev => prev.filter(msg => msg.id !== id));
            toast.success('Mensagem apagada com sucesso.');
        }
    };

    const filteredMessages = messages.filter(msg =>
        msg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Mensagens de Contato</h1>
                    <p className="text-gray-500">Gerencie as mensagens recebidas pelo formulário de contato.</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Buscar por nome, email ou assunto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Messages Cards */}
            <div className="space-y-4">
                {filteredMessages.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                        <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">Nenhuma mensagem encontrada</h3>
                        <p className="text-gray-500">Nenhuma mensagem corresponde à sua busca.</p>
                    </div>
                ) : (
                    filteredMessages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`bg-white rounded-xl border p-6 transition-all ${!msg.read ? 'border-blue-200 shadow-md ring-1 ring-blue-100' : 'border-gray-200 hover:border-blue-200'
                                }`}
                        >
                            <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-full ${!msg.read ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{msg.name}</h3>
                                        <div className="text-sm text-gray-500 flex flex-col sm:flex-row sm:gap-4">
                                            <a href={`mailto:${msg.email}`} className="hover:text-blue-600 hover:underline">{msg.email}</a>
                                            <span className="hidden sm:inline text-gray-300">|</span>
                                            <span>{new Date(msg.created_at).toLocaleString('pt-BR')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-start">
                                    <button
                                        onClick={() => handleMarkAsRead(msg.id, msg.read)}
                                        className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${msg.read
                                                ? 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                                : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                            }`}
                                    >
                                        {msg.read ? (
                                            <>
                                                <Clock className="w-3 h-3" />
                                                Marcar como não lido
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-3 h-3" />
                                                Marcar como lido
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(msg.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Apagar mensagem"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="pl-0 md:pl-12">
                                <div className="mb-2">
                                    <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded font-medium">
                                        {msg.subject}
                                    </span>
                                </div>
                                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {msg.message}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
