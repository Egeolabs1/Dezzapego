import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import {
    approveProfileVerification,
    DEFAULT_VERIFICATION_REJECTION_REASON,
    parseVerificationDocs,
    rejectProfileVerification,
} from '../../../lib/adminVerification';
import { BadgeCheck, ExternalLink, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';

type PendingRow = {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    verification_docs: unknown;
    created_at: string | null;
};

export default function AdminVerification() {
    const [rows, setRows] = useState<PendingRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectSubmitting, setRejectSubmitting] = useState(false);
    const [approveSubmittingId, setApproveSubmittingId] = useState<string | null>(null);

    const fetchPending = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, phone, verification_docs, created_at')
                .eq('verification_status', 'pending')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            const list = (data || []) as PendingRow[];
            setRows(list);
            setSelectedId((prev) => {
                if (!list.length) return null;
                if (prev && list.some((r) => r.id === prev)) return prev;
                return list[0].id;
            });
        } catch (e) {
            console.error(e);
            toast.error('Não foi possível carregar as solicitações.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchPending();
    }, [fetchPending]);

    const selected = rows.find((r) => r.id === selectedId) ?? null;
    const docs = selected ? parseVerificationDocs(selected.verification_docs) : { doc: [], selfie: [] };

    const removeFromList = (userId: string) => {
        setRows((prev) => {
            const next = prev.filter((r) => r.id !== userId);
            setSelectedId((cur) => (cur === userId ? next[0]?.id ?? null : cur));
            return next;
        });
    };

    const handleApprove = async (userId: string) => {
        setApproveSubmittingId(userId);
        try {
            await approveProfileVerification(userId);
            toast.success('Conta verificada.');
            removeFromList(userId);
        } catch (e) {
            console.error(e);
            toast.error('Erro ao aprovar verificação.');
        } finally {
            setApproveSubmittingId(null);
        }
    };

    const openReject = () => {
        setRejectReason('');
        setRejectOpen(true);
    };

    const handleRejectConfirm = async () => {
        if (!selectedId) return;
        setRejectSubmitting(true);
        try {
            await rejectProfileVerification(selectedId, rejectReason);
            toast.success('Solicitação recusada. O usuário pode reenviar documentos.');
            setRejectOpen(false);
            removeFromList(selectedId);
        } catch (e) {
            console.error(e);
            toast.error('Erro ao recusar verificação.');
        } finally {
            setRejectSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Verificação de contas</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Analise documentos enviados pelos usuários e aprove ou recuse com motivo claro.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void fetchPending()}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                </button>
            </div>

            <p className="text-sm text-gray-500">
                A lista completa de usuários continua em{' '}
                <Link to="/admin/usuarios" className="text-blue-600 hover:underline font-medium">
                    Gerenciar Usuários
                </Link>
                .
            </p>

            {loading ? (
                <div className="flex justify-center py-24">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                </div>
            ) : rows.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-600">
                    Nenhuma solicitação em análise no momento.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[420px]">
                    <aside className="lg:col-span-4 space-y-2">
                        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                            Fila ({rows.length})
                        </h2>
                        <ul className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
                            {rows.map((r) => {
                                const active = r.id === selectedId;
                                return (
                                    <li key={r.id}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedId(r.id)}
                                            className={`w-full text-left px-4 py-3 transition-colors ${
                                                active ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            <p className="font-medium text-gray-900 truncate">
                                                {r.full_name || 'Sem nome'}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">{r.email || r.id}</p>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </aside>

                    <section className="lg:col-span-8 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                        {selected && (
                            <>
                                <div className="p-5 border-b border-gray-100 flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">
                                            {selected.full_name || 'Usuário'}
                                        </h2>
                                        <p className="text-sm text-gray-600">{selected.email}</p>
                                        <p className="text-sm text-gray-600">{selected.phone || '—'}</p>
                                        <p className="text-xs text-gray-400 font-mono mt-1">{selected.id}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <a
                                            href={`/anunciante/${selected.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Perfil público
                                        </a>
                                        <button
                                            type="button"
                                            disabled={approveSubmittingId === selected.id}
                                            onClick={() => void handleApprove(selected.id)}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                                        >
                                            {approveSubmittingId === selected.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <BadgeCheck className="w-4 h-4" />
                                            )}
                                            Aprovar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={openReject}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Recusar…
                                        </button>
                                    </div>
                                </div>

                                <div className="p-5 flex-1 overflow-y-auto max-h-[calc(70vh-8rem)]">
                                    {!docs.doc.length && !docs.selfie.length ? (
                                        <p className="text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-4 text-sm">
                                            Este usuário está como &quot;em análise&quot; mas não há imagens de
                                            documento anexadas. Você pode recusar pedindo novo envio ou aguardar.
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                                    Documento (RG/CNH)
                                                </h3>
                                                <div className="space-y-3">
                                                    {docs.doc.map((url, i) => (
                                                        <img
                                                            key={`${url}-${i}`}
                                                            src={url}
                                                            alt=""
                                                            className="w-full rounded-lg border border-gray-200 object-contain max-h-80 bg-gray-50"
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                                    Selfie com documento
                                                </h3>
                                                <div className="space-y-3">
                                                    {docs.selfie.map((url, i) => (
                                                        <img
                                                            key={`${url}-${i}`}
                                                            src={url}
                                                            alt=""
                                                            className="w-full rounded-lg border border-gray-200 object-contain max-h-80 bg-gray-50"
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </section>
                </div>
            )}

            {rejectOpen && selected && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="reject-verification-title"
                    onClick={() => !rejectSubmitting && setRejectOpen(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 id="reject-verification-title" className="text-lg font-bold text-gray-900">
                            Recusar verificação
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            O usuário <strong>{selected.full_name || selected.email}</strong> verá esta mensagem no
                            painel.
                        </p>
                        <label className="block mt-4 text-sm font-medium text-gray-700" htmlFor="reject-reason">
                            Motivo da recusa
                        </label>
                        <textarea
                            id="reject-reason"
                            rows={4}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder={DEFAULT_VERIFICATION_REJECTION_REASON}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Se deixar em branco, será usado o texto padrão de documentação não aprovada.
                        </p>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setRejectOpen(false)}
                                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={rejectSubmitting}
                                onClick={() => void handleRejectConfirm()}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50"
                            >
                                {rejectSubmitting ? 'Enviando…' : 'Confirmar recusa'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
