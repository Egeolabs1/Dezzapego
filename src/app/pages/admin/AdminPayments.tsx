import { useEffect, useState } from 'react';
import { CreditCard, Eye, RefreshCw, Save, Search, Star } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { FeaturedPayment, FeaturedPlan, formatCents } from '../../../lib/featuredPayments';

type AdminPayment = FeaturedPayment & {
    ads?: { title?: string; images?: string[] } | null;
    profiles?: { full_name?: string | null; email?: string | null } | null;
};

export default function AdminPayments() {
    const [plans, setPlans] = useState<FeaturedPlan[]>([]);
    const [payments, setPayments] = useState<AdminPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [providerFilter, setProviderFilter] = useState('all');
    const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(null);

    useEffect(() => {
        fetchPaymentsData();
    }, []);

    async function fetchPaymentsData() {
        setLoading(true);
        try {
            const [{ data: plansData, error: plansError }, { data: paymentsData, error: paymentsError }] = await Promise.all([
                supabase
                    .from('featured_plans')
                    .select('*')
                    .order('sort_order', { ascending: true }),
                supabase
                    .from('featured_payments')
                    .select('*, featured_plans(name, duration_days), ads(title, images)')
                    .order('created_at', { ascending: false })
                    .limit(200),
            ]);

            if (plansError) throw plansError;
            if (paymentsError) throw paymentsError;

            setPlans((plansData || []) as FeaturedPlan[]);
            setPayments((paymentsData || []) as AdminPayment[]);
        } catch (error) {
            console.error('Error fetching payments:', error);
            toast.error('Erro ao carregar pagamentos.');
        } finally {
            setLoading(false);
        }
    }

    async function updatePlan(plan: FeaturedPlan) {
        setSavingPlanId(plan.id);
        try {
            const { error } = await supabase
                .from('featured_plans')
                .update({
                    name: plan.name,
                    duration_days: plan.duration_days,
                    price_cents: plan.price_cents,
                    active: plan.active,
                })
                .eq('id', plan.id);

            if (error) throw error;
            toast.success('Plano atualizado.');
        } catch (error) {
            console.error('Error updating plan:', error);
            toast.error('Erro ao atualizar plano.');
        } finally {
            setSavingPlanId(null);
        }
    }

    function updateLocalPlan(planId: string, updates: Partial<FeaturedPlan>) {
        setPlans((prev) => prev.map((plan) => plan.id === planId ? { ...plan, ...updates } : plan));
    }

    async function updatePaymentStatus(payment: AdminPayment, status: AdminPayment['status']) {
        const confirmed = window.confirm(`Confirma alterar o pagamento para "${statusLabel(status)}"?`);
        if (!confirmed) return;

        try {
            const updates: Record<string, unknown> = { status };

            if (status === 'paid') {
                const durationDays = payment.featured_plans?.duration_days || 7;
                const startsAt = payment.expires_at && new Date(payment.expires_at) > new Date()
                    ? new Date(payment.expires_at)
                    : new Date();
                const expiresAt = new Date(startsAt);
                expiresAt.setDate(expiresAt.getDate() + durationDays);

                updates.paid_at = new Date().toISOString();
                updates.expires_at = expiresAt.toISOString();

                const { error: adError } = await supabase
                    .from('ads')
                    .update({ featured: true, featured_expires_at: expiresAt.toISOString() })
                    .eq('id', payment.ad_id);

                if (adError) throw adError;
            }

            if (status === 'expired' || status === 'refunded' || status === 'failed') {
                const { error: adError } = await supabase
                    .from('ads')
                    .update({ featured: false })
                    .eq('id', payment.ad_id);

                if (adError) throw adError;
            }

            const { error } = await supabase
                .from('featured_payments')
                .update(updates)
                .eq('id', payment.id);

            if (error) throw error;
            toast.success('Pagamento atualizado.');
            await fetchPaymentsData();
        } catch (error) {
            console.error('Error updating payment:', error);
            toast.error('Erro ao atualizar pagamento.');
        }
    }

    const filteredPayments = payments.filter((payment) => {
        if (statusFilter !== 'all' && payment.status !== statusFilter) return false;
        if (providerFilter !== 'all' && payment.provider !== providerFilter) return false;

        const query = searchTerm.toLowerCase().trim();
        if (!query) return true;

        return [
            payment.id,
            payment.provider,
            payment.status,
            payment.ads?.title,
            payment.featured_plans?.name,
        ].some((value) => String(value || '').toLowerCase().includes(query));
    });

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Pagamentos e Destaques</h1>
                    <p className="text-sm text-gray-500 mt-1">Controle planos, pagamentos Stripe/PixGo e ativações de destaque.</p>
                </div>
                <button
                    onClick={fetchPaymentsData}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                    <RefreshCw className="w-4 h-4" />
                    Atualizar
                </button>
            </div>

            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-6">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <h2 className="text-lg font-semibold text-gray-800">Planos de destaque</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {plans.map((plan) => (
                        <div key={plan.id} className="border border-gray-200 rounded-xl p-4 space-y-4">
                            <div>
                                <label className="text-xs font-medium text-gray-500">Nome</label>
                                <input
                                    title="Nome do plano"
                                    value={plan.name}
                                    onChange={(event) => updateLocalPlan(plan.id, { name: event.target.value })}
                                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Dias</label>
                                    <input
                                        title="Duração do plano em dias"
                                        type="number"
                                        value={plan.duration_days}
                                        onChange={(event) => updateLocalPlan(plan.id, { duration_days: Number(event.target.value) })}
                                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Preço (R$)</label>
                                    <input
                                        title="Preço do plano em reais"
                                        type="number"
                                        min={10}
                                        step="0.01"
                                        value={(plan.price_cents / 100).toFixed(2)}
                                        onChange={(event) => updateLocalPlan(plan.id, { price_cents: Math.round(Number(event.target.value) * 100) })}
                                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                                    />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={plan.active}
                                    onChange={(event) => updateLocalPlan(plan.id, { active: event.target.checked })}
                                />
                                Plano ativo
                            </label>
                            <button
                                onClick={() => updatePlan(plan)}
                                disabled={savingPlanId === plan.id}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                            >
                                <Save className="w-4 h-4" />
                                {savingPlanId === plan.id ? 'Salvando...' : 'Salvar plano'}
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-gray-500" />
                        <h2 className="text-lg font-semibold text-gray-800">Pagamentos recentes</h2>
                    </div>
                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
                            title="Filtrar por status"
                        >
                            <option value="all">Todos os status</option>
                            <option value="pending">Pendentes</option>
                            <option value="paid">Pagos</option>
                            <option value="expired">Expirados</option>
                            <option value="refunded">Estornados</option>
                            <option value="failed">Falhos</option>
                        </select>
                        <select
                            value={providerFilter}
                            onChange={(event) => setProviderFilter(event.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
                            title="Filtrar por provedor"
                        >
                            <option value="all">Todos provedores</option>
                            <option value="stripe">Stripe</option>
                            <option value="pixgo">PixGo</option>
                        </select>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Buscar pagamento..."
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-100">
                                <th className="p-4 font-medium">Anúncio</th>
                                <th className="p-4 font-medium">Plano</th>
                                <th className="p-4 font-medium">Valor</th>
                                <th className="p-4 font-medium">Provedor</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium">Criado em</th>
                                <th className="p-4 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">Carregando...</td></tr>
                            ) : filteredPayments.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">Nenhum pagamento encontrado.</td></tr>
                            ) : filteredPayments.map((payment) => (
                                <tr key={payment.id} className="hover:bg-gray-50">
                                    <td className="p-4">
                                        <p className="font-medium text-gray-900 max-w-xs truncate">{payment.ads?.title || payment.ad_id}</p>
                                        <p className="text-xs text-gray-500">{payment.id}</p>
                                    </td>
                                    <td className="p-4 text-sm text-gray-700">
                                        {payment.featured_plans?.name || payment.plan_id}
                                    </td>
                                    <td className="p-4 text-sm font-semibold text-gray-900">
                                        {formatCents(payment.amount_cents, payment.currency)}
                                    </td>
                                    <td className="p-4 text-sm text-gray-700 uppercase">{payment.provider}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass(payment.status)}`}>
                                            {statusLabel(payment.status)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {new Date(payment.created_at).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setSelectedPayment(payment)}
                                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                title="Ver detalhes"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <select
                                                value=""
                                                onChange={(event) => {
                                                    const nextStatus = event.target.value as AdminPayment['status'];
                                                    if (nextStatus) updatePaymentStatus(payment, nextStatus);
                                                }}
                                                className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white"
                                                title="Ação administrativa"
                                            >
                                                <option value="">Ação</option>
                                                <option value="paid">Ativar destaque</option>
                                                <option value="expired">Marcar expirado</option>
                                                <option value="refunded">Marcar estornado</option>
                                                <option value="failed">Marcar falho</option>
                                            </select>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            {selectedPayment && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto p-6">
                        <div className="flex items-start justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Detalhes do pagamento</h3>
                                <p className="text-sm text-gray-500">{selectedPayment.id}</p>
                            </div>
                            <button
                                onClick={() => setSelectedPayment(null)}
                                className="text-gray-500 hover:text-gray-800"
                            >
                                Fechar
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <Detail label="Anúncio" value={selectedPayment.ads?.title || selectedPayment.ad_id} />
                            <Detail label="Plano" value={selectedPayment.featured_plans?.name || selectedPayment.plan_id} />
                            <Detail label="Provedor" value={selectedPayment.provider.toUpperCase()} />
                            <Detail label="Status" value={statusLabel(selectedPayment.status)} />
                            <Detail label="Valor bruto" value={formatCents(selectedPayment.gross_amount_cents || selectedPayment.amount_cents, selectedPayment.currency)} />
                            <Detail label="Valor líquido" value={formatCents(selectedPayment.net_amount_cents || 0, selectedPayment.currency)} />
                            <Detail label="Taxas" value={formatCents(selectedPayment.fee_amount_cents || 0, selectedPayment.currency)} />
                            <Detail label="ID externo" value={selectedPayment.external_id || 'N/A'} />
                            <Detail label="Checkout externo" value={selectedPayment.external_checkout_id || 'N/A'} />
                            <Detail label="Expira em" value={selectedPayment.expires_at ? new Date(selectedPayment.expires_at).toLocaleString('pt-BR') : 'N/A'} />
                        </div>

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Payload title="Payload provedor" value={selectedPayment.provider_payload} />
                            <Payload title="Payload webhook" value={selectedPayment.webhook_payload} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
            <p className="mt-1 text-gray-900 break-words">{value}</p>
        </div>
    );
}

function Payload({ title, value }: { title: string; value: unknown }) {
    return (
        <div>
            <p className="text-sm font-semibold text-gray-800 mb-2">{title}</p>
            <pre className="max-h-64 overflow-auto rounded-lg bg-gray-950 text-gray-100 p-3 text-xs">
                {value ? JSON.stringify(value, null, 2) : 'Sem payload'}
            </pre>
        </div>
    );
}

function statusLabel(status: FeaturedPayment['status']) {
    const labels = {
        pending: 'Pendente',
        paid: 'Pago',
        expired: 'Expirado',
        refunded: 'Estornado',
        failed: 'Falhou',
    };
    return labels[status] || status;
}

function statusClass(status: FeaturedPayment['status']) {
    const classes = {
        pending: 'bg-orange-50 text-orange-700',
        paid: 'bg-green-50 text-green-700',
        expired: 'bg-gray-100 text-gray-700',
        refunded: 'bg-purple-50 text-purple-700',
        failed: 'bg-red-50 text-red-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
}
