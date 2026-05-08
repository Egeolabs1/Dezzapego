import { useEffect, useState } from 'react';
import { CreditCard, Eye, RefreshCw, Save, Search, Star, Zap, Plus, Trash2, TicketPercent } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { FeaturedPayment, FeaturedPlan, formatCents } from '../../../lib/featuredPayments';
import { DiscountCoupon } from '../../../lib/discountCoupons';

type AdminPayment = FeaturedPayment & {
    ads?: { title?: string; images?: string[] } | null;
    profiles?: { full_name?: string | null; email?: string | null } | null;
    discount_cents?: number;
    coupon_code?: string | null;
};

type AccountPlan = {
    id: string;
    name: string;
    description: string;
    price_cents: number;
    currency: string;
    price_label: string;
    period_label: string;
    features: string[];
    button_text: string;
    button_link: string;
    max_active_ads: number | null;
    max_photos_per_ad: number;
    monthly_featured_ads: number;
    highlighted: boolean;
    icon_name: string;
    sort_order: number;
    active: boolean;
};

const PERIOD_OPTIONS = [
    { value: '/semana', label: 'Semana' },
    { value: '/mês', label: 'Mês' }
];

function getAutomaticButtonLink(plan: Pick<AccountPlan, 'id' | 'price_cents'>) {
    if (plan.price_cents <= 0) return '/register';
    return `/register?plan=${encodeURIComponent(plan.id)}`;
}

const DEFAULT_ACCOUNT_PLANS: AccountPlan[] = [
    {
        id: '00000000-0000-4000-8000-000000000001',
        name: 'Grátis',
        description: 'Para quem está começando a desapegar.',
        price_cents: 0,
        currency: 'BRL',
        price_label: 'R$ 0',
        period_label: '/mês',
        features: ['Até 5 anúncios ativos', '3 fotos por anúncio', 'Chat com compradores', 'Suporte básico'],
        button_text: 'Começar Grátis',
        button_link: '/register',
        max_active_ads: 5,
        max_photos_per_ad: 3,
        monthly_featured_ads: 0,
        highlighted: false,
        icon_name: 'Zap',
        sort_order: 0,
        active: true
    },
    {
        id: '00000000-0000-4000-8000-000000000002',
        name: 'Pro',
        description: 'Para quem vende com frequência.',
        price_cents: 2990,
        currency: 'BRL',
        price_label: 'R$ 29,90',
        period_label: '/mês',
        features: ['Até 50 anúncios ativos', '10 fotos por anúncio', 'Destaque em 2 anúncios/mês', 'Suporte prioritário', 'Estatísticas detalhadas'],
        button_text: 'Assinar Pro',
        button_link: getAutomaticButtonLink({ id: '00000000-0000-4000-8000-000000000002', price_cents: 2990 }),
        max_active_ads: 50,
        max_photos_per_ad: 10,
        monthly_featured_ads: 2,
        highlighted: true,
        icon_name: 'Star',
        sort_order: 1,
        active: true
    },
    {
        id: '00000000-0000-4000-8000-000000000003',
        name: 'Empresa',
        description: 'Para lojas e pequenos negócios.',
        price_cents: 8990,
        currency: 'BRL',
        price_label: 'R$ 89,90',
        period_label: '/mês',
        features: ['Anúncios ilimitados', '20 fotos por anúncio', 'Destaque em 10 anúncios/mês', 'Perfil verificado (Selo)', 'Painel de gestão avançado', 'Integração via API (Em breve)'],
        button_text: 'Assinar Empresa',
        button_link: getAutomaticButtonLink({ id: '00000000-0000-4000-8000-000000000003', price_cents: 8990 }),
        max_active_ads: null,
        max_photos_per_ad: 20,
        monthly_featured_ads: 10,
        highlighted: false,
        icon_name: 'Shield',
        sort_order: 2,
        active: true
    }
];

function toAccountPlan(row: Partial<AccountPlan>): AccountPlan {
    return {
        id: row.id || crypto.randomUUID(),
        name: row.name || 'Novo Plano',
        description: row.description || '',
        price_cents: Number(row.price_cents || 0),
        currency: row.currency || 'BRL',
        price_label: row.price_label || formatCents(Number(row.price_cents || 0), row.currency || 'BRL'),
        period_label: PERIOD_OPTIONS.some((period) => period.value === row.period_label) ? row.period_label || '/mês' : '/mês',
        features: Array.isArray(row.features) ? row.features : [],
        button_text: row.button_text || 'Assinar',
        button_link: row.button_link || getAutomaticButtonLink({
            id: row.id || '',
            price_cents: Number(row.price_cents || 0)
        }),
        max_active_ads: row.max_active_ads === null ? null : Number(row.max_active_ads ?? 5),
        max_photos_per_ad: Number(row.max_photos_per_ad || 3),
        monthly_featured_ads: Number(row.monthly_featured_ads || 0),
        highlighted: Boolean(row.highlighted),
        icon_name: row.icon_name || 'Zap',
        sort_order: Number(row.sort_order || 0),
        active: row.active !== false
    };
}

function getMissingSchemaColumn(error: unknown) {
    const message = typeof error === 'object' && error && 'message' in error
        ? String((error as { message?: unknown }).message || '')
        : '';
    return message.match(/Could not find the '([^']+)' column/)?.[1] || null;
}

function omitKey<T extends Record<string, unknown>>(payload: T, key: string) {
    const next = { ...payload };
    delete next[key];
    return next;
}

export default function AdminPayments() {
    const [featuredPlans, setFeaturedPlans] = useState<FeaturedPlan[]>([]);
    const [accountPlans, setAccountPlans] = useState<AccountPlan[]>([]);
    const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
    const [payments, setPayments] = useState<AdminPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
    const [savingAccountPlanId, setSavingAccountPlanId] = useState<string | null>(null);
    const [savingCouponId, setSavingCouponId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const providerFilter = 'all';
    const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(null);

    useEffect(() => {
        fetchPaymentsData();
    }, []);

    async function fetchPaymentsData() {
        setLoading(true);
        try {
            const [
                { data: fPlansData, error: fPlansError },
                { data: aPlansData, error: aPlansError },
                { data: couponsData, error: couponsError },
                { data: paymentsData, error: paymentsError }
            ] = await Promise.all([
                supabase
                    .from('featured_plans')
                    .select('*')
                    .order('sort_order', { ascending: true }),
                supabase
                    .from('account_plans')
                    .select('*')
                    .order('sort_order', { ascending: true }),
                supabase
                    .from('discount_coupons')
                    .select('*')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('featured_payments')
                    .select('*, featured_plans(name, duration_days), ads(title, images)')
                    .order('created_at', { ascending: false })
                    .limit(200),
            ]);

            if (fPlansError) throw fPlansError;
            // Silently handle account_plans error if table doesn't exist yet
            if (aPlansError && aPlansError.code !== 'PGRST116') {
                console.warn('Account plans table might be missing:', aPlansError);
            }
            if (couponsError && couponsError.code !== 'PGRST116') throw couponsError;
            if (paymentsError) throw paymentsError;

            setFeaturedPlans((fPlansData || []) as FeaturedPlan[]);
            setAccountPlans(aPlansData?.length ? (aPlansData as Partial<AccountPlan>[]).map(toAccountPlan) : DEFAULT_ACCOUNT_PLANS);
            setCoupons((couponsData || []) as DiscountCoupon[]);
            setPayments((paymentsData || []) as AdminPayment[]);
        } catch (error) {
            console.error('Error fetching payments:', error);
            toast.error('Erro ao carregar pagamentos.');
        } finally {
            setLoading(false);
        }
    }

    async function updateFeaturedPlan(plan: FeaturedPlan) {
        setSavingPlanId(plan.id);
        try {
            const { error } = await supabase
                .from('featured_plans')
                .update({
                    name: plan.name,
                    duration_days: plan.duration_days,
                    price_cents: plan.price_cents,
                    currency: plan.currency || 'BRL',
                    sort_order: plan.sort_order,
                    active: plan.active,
                })
                .eq('id', plan.id);

            if (error) throw error;
            toast.success('Plano de destaque atualizado.');
        } catch (error) {
            console.error('Error updating plan:', error);
            toast.error('Erro ao atualizar plano.');
        } finally {
            setSavingPlanId(null);
        }
    }

    async function updateAccountPlan(plan: AccountPlan) {
        setSavingAccountPlanId(plan.id);
        try {
            let payload: Record<string, unknown> = {
                id: plan.id,
                name: plan.name,
                description: plan.description,
                price_cents: plan.price_cents,
                currency: plan.currency,
                price_label: plan.price_label,
                period_label: plan.period_label,
                    features: plan.features,
                    button_text: plan.button_text,
                    button_link: plan.button_link || getAutomaticButtonLink(plan),
                    max_active_ads: plan.max_active_ads,
                max_photos_per_ad: plan.max_photos_per_ad,
                monthly_featured_ads: plan.monthly_featured_ads,
                highlighted: plan.highlighted,
                icon_name: plan.icon_name,
                sort_order: plan.sort_order,
                active: plan.active,
            };

            for (let attempt = 0; attempt < 8; attempt += 1) {
                const { error } = await supabase.from('account_plans').upsert(payload);
                if (!error) {
                    toast.success('Plano de conta atualizado.');
                    fetchPaymentsData();
                    return;
                }

                const missingColumn = getMissingSchemaColumn(error);
                if (!missingColumn || !(missingColumn in payload)) throw error;
                payload = omitKey(payload, missingColumn);
            }

            throw new Error('Schema de account_plans incompleto para salvar este plano.');
        } catch (error) {
            console.error('Error updating account plan:', error);
            toast.error('Erro ao atualizar plano. Rode o SQL atualizado e aguarde o cache do Supabase recarregar.');
        } finally {
            setSavingAccountPlanId(null);
        }
    }

    function updateLocalFeaturedPlan(planId: string, updates: Partial<FeaturedPlan>) {
        setFeaturedPlans((prev) => prev.map((plan) => plan.id === planId ? { ...plan, ...updates } : plan));
    }

    function updateLocalAccountPlan(planId: string, updates: Partial<AccountPlan>) {
        setAccountPlans((prev) => prev.map((plan) => plan.id === planId ? { ...plan, ...updates } : plan));
    }

    function updateLocalCoupon(couponId: string, updates: Partial<DiscountCoupon>) {
        setCoupons((prev) => prev.map((coupon) => coupon.id === couponId ? { ...coupon, ...updates } : coupon));
    }

    function addNewCoupon() {
        setCoupons((prev) => [{
            id: crypto.randomUUID(),
            code: 'NOVOCUPOM',
            description: '',
            applies_to: 'all',
            discount_type: 'percent',
            discount_value: 10,
            max_uses: null,
            used_count: 0,
            starts_at: null,
            ends_at: null,
            active: true,
        }, ...prev]);
    }

    async function saveCoupon(coupon: DiscountCoupon) {
        setSavingCouponId(coupon.id);
        try {
            const code = coupon.code.trim().toUpperCase();
            if (!code) throw new Error('Informe um código.');
            if (coupon.discount_type === 'percent' && (coupon.discount_value <= 0 || coupon.discount_value > 100)) {
                throw new Error('Percentual deve estar entre 1 e 100.');
            }

            const { error } = await supabase.from('discount_coupons').upsert({
                id: coupon.id,
                code,
                description: coupon.description || null,
                applies_to: coupon.applies_to,
                discount_type: coupon.discount_type,
                discount_value: Math.max(0, Number(coupon.discount_value) || 0),
                max_uses: coupon.max_uses === null ? null : Math.max(1, Number(coupon.max_uses) || 1),
                used_count: Math.max(0, Number(coupon.used_count) || 0),
                starts_at: coupon.starts_at || null,
                ends_at: coupon.ends_at || null,
                active: coupon.active,
            });

            if (error) throw error;
            toast.success('Cupom salvo.');
            fetchPaymentsData();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao salvar cupom.');
        } finally {
            setSavingCouponId(null);
        }
    }

    async function deleteCoupon(id: string) {
        if (!window.confirm('Tem certeza que deseja excluir este cupom?')) return;
        try {
            const { error } = await supabase.from('discount_coupons').delete().eq('id', id);
            if (error) throw error;
            setCoupons((prev) => prev.filter((coupon) => coupon.id !== id));
            toast.success('Cupom excluído.');
        } catch (error) {
            toast.error('Erro ao excluir cupom.');
        }
    }

    async function deleteAccountPlan(id: string) {
        if (!window.confirm('Tem certeza que deseja excluir este plano?')) return;
        try {
            const { error } = await supabase.from('account_plans').delete().eq('id', id);
            if (error) throw error;
            setAccountPlans(prev => prev.filter(p => p.id !== id));
            toast.success('Plano excluído.');
        } catch (error) {
            toast.error('Erro ao excluir plano.');
        }
    }

    function addNewAccountPlan() {
        const id = crypto.randomUUID();
        const newPlan: AccountPlan = {
            id,
            name: 'Novo Plano',
            description: 'Descrição do plano',
            price_cents: 0,
            currency: 'BRL',
            price_label: 'R$ 0',
            period_label: '/mês',
            features: ['Funcionalidade 1'],
            button_text: 'Assinar',
            button_link: getAutomaticButtonLink({ id, price_cents: 0 }),
            max_active_ads: 5,
            max_photos_per_ad: 3,
            monthly_featured_ads: 0,
            highlighted: false,
            icon_name: 'Zap',
            sort_order: accountPlans.length,
            active: true
        };
        setAccountPlans([...accountPlans, newPlan]);
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
        <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Pagamentos e Planos</h1>
                    <p className="text-sm text-gray-500 mt-1">Configure os planos de conta, destaques avulsos e gerencie pagamentos.</p>
                </div>
                <button
                    onClick={fetchPaymentsData}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm transition-all"
                >
                    <RefreshCw className="w-4 h-4" />
                    Atualizar Dados
                </button>
            </div>

            {/* Account Plans Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-blue-600" />
                        <h2 className="text-xl font-bold text-gray-900">Planos de Conta (Subscription)</h2>
                    </div>
                    <button
                        onClick={addNewAccountPlan}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 font-semibold transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Plano
                    </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {accountPlans.map((plan) => (
                        <div key={plan.id} className={`relative border rounded-2xl p-6 transition-all ${plan.highlighted ? 'border-blue-600 ring-4 ring-blue-50 bg-blue-50/10' : 'border-gray-200 bg-white'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Nome do Plano</label>
                                    <input
                                        value={plan.name}
                                        onChange={(e) => updateLocalAccountPlan(plan.id, { name: e.target.value })}
                                        className="text-xl font-bold text-gray-900 bg-transparent border-b border-transparent focus:border-blue-600 focus:outline-none w-full"
                                    />
                                </div>
                                <button onClick={() => deleteAccountPlan(plan.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Descrição Curta</label>
                                    <input
                                        value={plan.description}
                                        onChange={(e) => updateLocalAccountPlan(plan.id, { description: e.target.value })}
                                        className="w-full text-sm text-gray-600 bg-transparent border-b border-gray-100 py-1"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Preço (Ex: R$ 29,90)</label>
                                        <input
                                            value={plan.price_label}
                                            onChange={(e) => updateLocalAccountPlan(plan.id, { price_label: e.target.value, price_cents: Math.round(Number(e.target.value.replace(/[^\d,.-]/g, '').replace(',', '.')) * 100) || 0 })}
                                            className="w-full text-lg font-bold text-gray-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Período</label>
                                        <select
                                            value={plan.period_label}
                                            onChange={(e) => updateLocalAccountPlan(plan.id, { period_label: e.target.value })}
                                            className="w-full text-sm text-gray-700 mt-2 bg-gray-50 border border-gray-100 rounded-lg p-2"
                                        >
                                            {PERIOD_OPTIONS.map((period) => (
                                                <option key={period.value} value={period.value}>{period.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-blue-500 tracking-wider">Anúncios ativos</label>
                                        <input
                                            type="number"
                                            min={0}
                                            placeholder="0 = ilimitado"
                                            value={plan.max_active_ads ?? 0}
                                            onChange={(e) => {
                                                const value = Number(e.target.value);
                                                updateLocalAccountPlan(plan.id, { max_active_ads: value <= 0 ? null : value });
                                            }}
                                            className="w-full text-sm bg-white border border-blue-100 rounded-lg p-2"
                                        />
                                        <p className="mt-1 text-[10px] font-medium text-blue-500">0 = ilimitado</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-blue-500 tracking-wider">Fotos/anúncio</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={plan.max_photos_per_ad}
                                            onChange={(e) => updateLocalAccountPlan(plan.id, { max_photos_per_ad: Math.max(1, Number(e.target.value) || 1) })}
                                            className="w-full text-sm bg-white border border-blue-100 rounded-lg p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-blue-500 tracking-wider">Destaques/mês</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={plan.monthly_featured_ads}
                                            onChange={(e) => updateLocalAccountPlan(plan.id, { monthly_featured_ads: Math.max(0, Number(e.target.value) || 0) })}
                                            className="w-full text-sm bg-white border border-blue-100 rounded-lg p-2"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider block mb-2">Vantagens (uma por linha)</label>
                                    <textarea
                                        value={plan.features.join('\n')}
                                        onChange={(e) => updateLocalAccountPlan(plan.id, { features: e.target.value.split('\n') })}
                                        rows={4}
                                        className="w-full text-xs text-gray-600 bg-gray-50 rounded-xl p-3 border border-gray-100 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Texto do Botão</label>
                                    <input
                                        value={plan.button_text}
                                        onChange={(e) => updateLocalAccountPlan(plan.id, { button_text: e.target.value })}
                                        className="w-full text-sm bg-gray-50 border border-gray-100 rounded-lg p-2"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Link do Botão</label>
                                    <input
                                        value={plan.button_link}
                                        onChange={(e) => updateLocalAccountPlan(plan.id, { button_link: e.target.value })}
                                        placeholder={getAutomaticButtonLink(plan)}
                                        className="w-full text-sm bg-gray-50 border border-gray-100 rounded-lg p-2"
                                    />
                                    <p className="mt-1 text-[10px] text-gray-400">
                                        Use o padrão para assinatura: {getAutomaticButtonLink(plan)}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Ícone (Zap, Star, Shield)</label>
                                        <select
                                            value={plan.icon_name}
                                            onChange={(e) => updateLocalAccountPlan(plan.id, { icon_name: e.target.value })}
                                            className="w-full text-sm bg-gray-50 border border-gray-100 rounded-lg p-2"
                                        >
                                            <option value="Zap">Zap (Raio)</option>
                                            <option value="Star">Star (Estrela)</option>
                                            <option value="Shield">Shield (Escudo)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Ordem</label>
                                        <input
                                            type="number"
                                            value={plan.sort_order}
                                            onChange={(e) => updateLocalAccountPlan(plan.id, { sort_order: Number(e.target.value) })}
                                            className="w-full text-sm bg-gray-50 border border-gray-100 rounded-lg p-2"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={plan.highlighted}
                                            onChange={(e) => updateLocalAccountPlan(plan.id, { highlighted: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 rounded border-gray-300"
                                        />
                                        Plano em Destaque
                                    </label>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={plan.active}
                                            onChange={(e) => updateLocalAccountPlan(plan.id, { active: e.target.checked })}
                                            className="w-4 h-4 text-green-600 rounded border-gray-300"
                                        />
                                        Ativo
                                    </label>
                                </div>

                                <button
                                    onClick={() => updateAccountPlan(plan)}
                                    disabled={savingAccountPlanId === plan.id}
                                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all shadow-md ${plan.highlighted ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-900 text-white hover:bg-black'}`}
                                >
                                    <Save className="w-4 h-4" />
                                    {savingAccountPlanId === plan.id ? 'Salvando...' : 'Salvar Configurações'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Featured Plans (Destaques Avulsos) Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-8">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <h2 className="text-xl font-bold text-gray-900">Destaques Avulsos (Ads)</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {featuredPlans.map((plan) => (
                        <div key={plan.id} className="border border-gray-200 rounded-2xl p-5 space-y-4 bg-gray-50/50">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Título do Destaque</label>
                                <input
                                    value={plan.name}
                                    onChange={(event) => updateLocalFeaturedPlan(plan.id, { name: event.target.value })}
                                    className="w-full font-bold text-gray-900 bg-transparent border-b border-gray-200"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Duração (Dias)</label>
                                    <input
                                        type="number"
                                        value={plan.duration_days}
                                        onChange={(event) => updateLocalFeaturedPlan(plan.id, { duration_days: Number(event.target.value) })}
                                        className="w-full text-sm font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Preço (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={(plan.price_cents / 100).toFixed(2)}
                                        onChange={(event) => updateLocalFeaturedPlan(plan.id, { price_cents: Math.round(Number(event.target.value) * 100) })}
                                        className="w-full text-sm font-semibold text-blue-600"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Ordem</label>
                                <input
                                    type="number"
                                    value={plan.sort_order}
                                    onChange={(event) => updateLocalFeaturedPlan(plan.id, { sort_order: Number(event.target.value) })}
                                    className="w-full text-sm font-semibold"
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
                                <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                    <input
                                        type="checkbox"
                                        checked={plan.active}
                                        onChange={(event) => updateLocalFeaturedPlan(plan.id, { active: event.target.checked })}
                                    />
                                    Habilitado
                                </label>
                                <button
                                    onClick={() => updateFeaturedPlan(plan)}
                                    disabled={savingPlanId === plan.id}
                                    className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-yellow-600 disabled:opacity-60"
                                >
                                    <Save className="h-4 w-4" />
                                    {savingPlanId === plan.id ? 'Salvando...' : 'Salvar destaque'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Coupons Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                        <TicketPercent className="w-5 h-5 text-emerald-600" />
                        <h2 className="text-xl font-bold text-gray-900">Cupons de Desconto</h2>
                    </div>
                    <button
                        onClick={addNewCoupon}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 font-semibold transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Cupom
                    </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {coupons.map((coupon) => (
                        <div key={coupon.id} className="rounded-2xl border border-gray-200 bg-gray-50/50 p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="grid flex-1 grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Código</label>
                                        <input
                                            value={coupon.code}
                                            onChange={(event) => updateLocalCoupon(coupon.id, { code: event.target.value.toUpperCase() })}
                                            className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm font-bold uppercase text-gray-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Aplicar em</label>
                                        <select
                                            value={coupon.applies_to}
                                            onChange={(event) => updateLocalCoupon(coupon.id, { applies_to: event.target.value as DiscountCoupon['applies_to'] })}
                                            className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm"
                                        >
                                            <option value="all">Planos e destaques</option>
                                            <option value="account_plan">Somente planos</option>
                                            <option value="featured">Somente destaques</option>
                                        </select>
                                    </div>
                                </div>
                                <button
                                    onClick={() => deleteCoupon(coupon.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Excluir cupom"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Tipo</label>
                                    <select
                                        value={coupon.discount_type}
                                        onChange={(event) => updateLocalCoupon(coupon.id, { discount_type: event.target.value as DiscountCoupon['discount_type'] })}
                                        className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm"
                                    >
                                        <option value="percent">Percentual</option>
                                        <option value="fixed">Valor fixo</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                                        {coupon.discount_type === 'percent' ? 'Desconto (%)' : 'Desconto (centavos)'}
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={coupon.discount_type === 'percent' ? 100 : undefined}
                                        value={coupon.discount_value}
                                        onChange={(event) => updateLocalCoupon(coupon.id, { discount_value: Number(event.target.value) || 0 })}
                                        className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Uso máximo</label>
                                    <input
                                        type="number"
                                        min={0}
                                        placeholder="0 = ilimitado"
                                        value={coupon.max_uses ?? 0}
                                        onChange={(event) => {
                                            const value = Number(event.target.value) || 0;
                                            updateLocalCoupon(coupon.id, { max_uses: value <= 0 ? null : value });
                                        }}
                                        className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Usados</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={coupon.used_count}
                                        onChange={(event) => updateLocalCoupon(coupon.id, { used_count: Number(event.target.value) || 0 })}
                                        className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Início</label>
                                    <input
                                        type="datetime-local"
                                        value={toDateTimeLocal(coupon.starts_at)}
                                        onChange={(event) => updateLocalCoupon(coupon.id, { starts_at: fromDateTimeLocal(event.target.value) })}
                                        className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Fim</label>
                                    <input
                                        type="datetime-local"
                                        value={toDateTimeLocal(coupon.ends_at)}
                                        onChange={(event) => updateLocalCoupon(coupon.id, { ends_at: fromDateTimeLocal(event.target.value) })}
                                        className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Descrição interna</label>
                                    <input
                                        value={coupon.description || ''}
                                        onChange={(event) => updateLocalCoupon(coupon.id, { description: event.target.value })}
                                        className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={coupon.active}
                                        onChange={(event) => updateLocalCoupon(coupon.id, { active: event.target.checked })}
                                    />
                                    Ativo
                                </label>
                                <button
                                    onClick={() => saveCoupon(coupon)}
                                    disabled={savingCouponId === coupon.id}
                                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                                >
                                    <Save className="h-4 w-4" />
                                    {savingCouponId === coupon.id ? 'Salvando...' : 'Salvar cupom'}
                                </button>
                            </div>
                        </div>
                    ))}
                    {!loading && coupons.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                            Nenhum cupom cadastrado.
                        </div>
                    )}
                </div>
            </section>

            {/* Payments Table Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-gray-500" />
                        <h2 className="text-lg font-semibold text-gray-800">Histórico de Pagamentos</h2>
                    </div>
                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-xl bg-white text-sm"
                            title="Filtrar por status"
                        >
                            <option value="all">Todos os status</option>
                            <option value="pending">Pendentes</option>
                            <option value="paid">Pagos</option>
                            <option value="expired">Expirados</option>
                            <option value="refunded">Estornados</option>
                            <option value="failed">Falhos</option>
                        </select>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Buscar transação..."
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                <th className="p-4 font-bold">Item / Usuário</th>
                                <th className="p-4 font-bold">Plano</th>
                                <th className="p-4 font-bold">Valor</th>
                                <th className="p-4 font-bold">Gateway</th>
                                <th className="p-4 font-bold">Status</th>
                                <th className="p-4 font-bold">Data</th>
                                <th className="p-4 font-bold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={7} className="p-12 text-center text-gray-400 animate-pulse font-medium">Buscando dados no servidor...</td></tr>
                            ) : filteredPayments.length === 0 ? (
                                <tr><td colSpan={7} className="p-12 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
                            ) : filteredPayments.map((payment) => (
                                <tr key={payment.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="p-4">
                                        <p className="font-semibold text-gray-900 max-w-xs truncate">{payment.ads?.title || 'Upgrade de Conta'}</p>
                                        <p className="text-[10px] text-gray-400 font-mono">{payment.id}</p>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">
                                        {payment.featured_plans?.name || payment.plan_id}
                                    </td>
                                    <td className="p-4 text-sm font-bold text-gray-900">
                                        {formatCents(payment.amount_cents, payment.currency)}
                                        {payment.discount_cents ? (
                                            <p className="mt-1 text-[10px] font-semibold text-emerald-700">
                                                Cupom {payment.coupon_code}: -{formatCents(payment.discount_cents, payment.currency)}
                                            </p>
                                        ) : null}
                                    </td>
                                    <td className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{payment.provider}</td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${statusClass(payment.status)}`}>
                                            {statusLabel(payment.status)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-xs text-gray-500">
                                        {new Date(payment.created_at).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setSelectedPayment(payment)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
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
                                                className="text-[10px] font-bold border border-gray-200 rounded-lg px-2 py-1 bg-white"
                                            >
                                                <option value="">Status</option>
                                                <option value="paid">Confirmar</option>
                                                <option value="expired">Expirar</option>
                                                <option value="refunded">Estornar</option>
                                                <option value="failed">Falhou</option>
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
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Comprovante de Transação</h3>
                                <p className="text-xs text-gray-400 font-mono mt-1">{selectedPayment.id}</p>
                            </div>
                            <button
                                onClick={() => setSelectedPayment(null)}
                                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-xl shadow-sm transition-all"
                            >
                                <Plus className="w-5 h-5 rotate-45" />
                            </button>
                        </div>

                        <div className="p-6 grid grid-cols-2 gap-4">
                            <Detail label="Item Relacionado" value={selectedPayment.ads?.title || 'Plano de Conta'} />
                            <Detail label="Pacote Adquirido" value={selectedPayment.featured_plans?.name || selectedPayment.plan_id} />
                            <Detail label="Gateway" value={selectedPayment.provider.toUpperCase()} />
                            <Detail label="Estado Atual" value={statusLabel(selectedPayment.status)} />
                            <Detail label="Total Pago" value={formatCents(selectedPayment.gross_amount_cents || selectedPayment.amount_cents, selectedPayment.currency)} />
                            <Detail label="Líquido Recebido" value={formatCents(selectedPayment.net_amount_cents || 0, selectedPayment.currency)} />
                            <Detail label="Taxas Gateway" value={formatCents(selectedPayment.fee_amount_cents || 0, selectedPayment.currency)} />
                            <Detail label="Data de Expiração" value={selectedPayment.expires_at ? new Date(selectedPayment.expires_at).toLocaleString('pt-BR') : 'Sem expiração'} />
                        </div>

                        <div className="p-6 bg-gray-50 grid grid-cols-1 gap-4">
                            <Payload title="Dados brutos do gateway" value={selectedPayment.provider_payload} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">{label}</p>
            <p className="text-sm font-bold text-gray-900 break-words">{value}</p>
        </div>
    );
}

function Payload({ title, value }: { title: string; value: unknown }) {
    return (
        <div>
            <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">{title}</p>
            <pre className="max-h-48 overflow-auto rounded-2xl bg-gray-900 text-green-400 p-4 text-[10px] font-mono leading-relaxed shadow-inner">
                {value ? JSON.stringify(value, null, 2) : '// Nenhum dado disponível'}
            </pre>
        </div>
    );
}

function toDateTimeLocal(value?: string | null) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
}

function statusLabel(status: FeaturedPayment['status']) {
    const labels = {
        pending: 'Aguardando',
        paid: 'Aprovado',
        expired: 'Expirado',
        refunded: 'Estornado',
        failed: 'Cancelado',
    };
    return labels[status] || status;
}

function statusClass(status: FeaturedPayment['status']) {
    const classes = {
        pending: 'bg-amber-100 text-amber-700',
        paid: 'bg-emerald-100 text-emerald-700',
        expired: 'bg-slate-100 text-slate-500',
        refunded: 'bg-fuchsia-100 text-fuchsia-700',
        failed: 'bg-rose-100 text-rose-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
}
