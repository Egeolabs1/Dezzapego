import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, Loader2, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import SEO from '../../components/SEO';
import { createAccountPlanPayment } from '../../lib/accountPlanPayments';
import { calculateCouponDiscount, DiscountCoupon, normalizeCouponCode } from '../../lib/discountCoupons';
import { FeaturedProvider, formatCents } from '../../lib/featuredPayments';
import { supabase } from '../../lib/supabase';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';

type AccountPlan = {
    id: string;
    name: string;
    description: string;
    price_cents: number;
    currency: string;
    price_label: string;
    period_label: string;
    features: string[];
};

export default function PlanCheckout() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const planId = searchParams.get('plan') || '';
    const [plan, setPlan] = useState<AccountPlan | null>(null);
    const [provider, setProvider] = useState<FeaturedProvider>('stripe');
    const [loading, setLoading] = useState(true);
    const [creatingPayment, setCreatingPayment] = useState(false);
    const [pixResult, setPixResult] = useState<{ qrCode?: string; qrImageUrl?: string; expiresAt?: string } | null>(null);
    const [couponCode, setCouponCode] = useState('');
    const [coupon, setCoupon] = useState<DiscountCoupon | null>(null);
    const [checkingCoupon, setCheckingCoupon] = useState(false);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            navigate(`/register${planId ? `?plan=${encodeURIComponent(planId)}` : ''}`, { replace: true });
            return;
        }

        async function fetchPlan() {
            if (!planId) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('account_plans')
                .select('id, name, description, price_cents, currency, price_label, period_label, features')
                .eq('id', planId)
                .eq('active', true)
                .maybeSingle();

            if (error) {
                toast.error('Erro ao carregar o plano.');
            }

            setPlan((data || null) as AccountPlan | null);
            setLoading(false);
        }

        fetchPlan();
    }, [authLoading, navigate, planId, user]);

    async function handlePayment() {
        if (!plan) return;

        setCreatingPayment(true);
        setPixResult(null);

        try {
            const result = await createAccountPlanPayment(plan.id, provider, coupon?.code || couponCode);
            if (result.checkoutUrl) {
                window.location.href = result.checkoutUrl;
                return;
            }
            if (result.pix) {
                setPixResult(result.pix);
                toast.success('PIX gerado. O plano será ativado após a confirmação do pagamento.');
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao iniciar pagamento.');
        } finally {
            setCreatingPayment(false);
        }
    }

    async function applyCoupon() {
        if (!plan) return;
        const code = normalizeCouponCode(couponCode);
        if (!code) {
            setCoupon(null);
            return;
        }

        setCheckingCoupon(true);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData.session?.access_token;
            if (!accessToken) throw new Error('Faça login para usar cupom.');

            const response = await fetch('/api/discount-coupons/validate', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ code, appliesTo: 'account_plan', amountCents: plan.price_cents }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload?.error || 'Cupom inválido.');

            setCoupon(payload.coupon as DiscountCoupon);
            setCouponCode(code);
            toast.success('Cupom aplicado.');
        } catch (error) {
            setCoupon(null);
            toast.error(error instanceof Error ? error.message : 'Cupom inválido.');
        } finally {
            setCheckingCoupon(false);
        }
    }

    const discountCents = plan && coupon ? calculateCouponDiscount(coupon, plan.price_cents) : 0;
    const finalAmountCents = plan ? Math.max(0, plan.price_cents - discountCents) : 0;

    return (
        <div className="min-h-screen bg-gray-50">
            <SEO title="Assinar plano" description="Finalize a assinatura do seu plano Dezzapego." noIndex />
            <Header hideLocationFilter />

            <main className="container mx-auto max-w-4xl px-4 py-10">
                <Link to="/planos" className="text-sm font-medium text-blue-600 hover:underline">
                    Voltar para planos
                </Link>

                <div className="mt-6 grid gap-6 md:grid-cols-[1fr_22rem]">
                    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        {loading ? (
                            <div className="flex items-center gap-2 text-gray-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Carregando plano...
                            </div>
                        ) : !plan ? (
                            <p className="text-gray-600">Plano não encontrado ou indisponível.</p>
                        ) : (
                            <>
                                <p className="text-sm font-semibold uppercase text-blue-600">Plano selecionado</p>
                                <h1 className="mt-2 text-3xl font-bold text-gray-900">{plan.name}</h1>
                                <p className="mt-2 text-gray-600">{plan.description}</p>
                                <p className="mt-6 text-4xl font-bold text-gray-900">
                                    {plan.price_label || formatCents(plan.price_cents, plan.currency)}
                                    <span className="text-base font-medium text-gray-500">{plan.period_label}</span>
                                </p>
                                <ul className="mt-6 space-y-2 text-sm text-gray-700">
                                    {plan.features.map((feature) => (
                                        <li key={feature}>- {feature}</li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </section>

                    <aside className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900">Pagamento</h2>
                        {plan && (
                            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span>{formatCents(plan.price_cents, plan.currency)}</span>
                                </div>
                                {coupon && (
                                    <div className="mt-1 flex justify-between text-emerald-700">
                                        <span>Cupom {coupon.code}</span>
                                        <span>-{formatCents(discountCents, plan.currency)}</span>
                                    </div>
                                )}
                                <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 font-bold text-gray-900">
                                    <span>Total</span>
                                    <span>{formatCents(finalAmountCents, plan.currency)}</span>
                                </div>
                            </div>
                        )}
                        <div className="mt-4">
                            <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Cupom de desconto</label>
                            <div className="mt-2 flex gap-2">
                                <input
                                    value={couponCode}
                                    onChange={(event) => {
                                        setCouponCode(event.target.value.toUpperCase());
                                        setCoupon(null);
                                    }}
                                    placeholder="EX: PROMO10"
                                    className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase"
                                />
                                <button
                                    type="button"
                                    onClick={applyCoupon}
                                    disabled={!plan || checkingCoupon}
                                    className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                                >
                                    {checkingCoupon ? '...' : 'Aplicar'}
                                </button>
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setProvider('stripe')}
                                className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-semibold ${provider === 'stripe' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700'}`}
                            >
                                <CreditCard className="h-4 w-4" />
                                <span className="text-left leading-tight">
                                    Cartão de crédito
                                    <span className="block text-xs font-medium opacity-75">via Stripe</span>
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setProvider('pixgo')}
                                className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-semibold ${provider === 'pixgo' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-700'}`}
                            >
                                <QrCode className="h-4 w-4" />
                                PIX
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handlePayment}
                            disabled={!plan || creatingPayment}
                            className="mt-5 flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                            {creatingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {provider === 'stripe' ? 'Pagar com cartão de crédito' : 'Gerar PIX'}
                        </button>

                        {pixResult && (
                            <div className="mt-5 space-y-3 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                                {pixResult.qrImageUrl ? (
                                    <img src={pixResult.qrImageUrl} alt="QR Code PIX" className="mx-auto h-48 w-48 rounded-lg bg-white object-contain p-2" />
                                ) : null}
                                {pixResult.qrCode ? (
                                    <textarea readOnly value={pixResult.qrCode} className="h-24 w-full rounded-lg border border-emerald-200 bg-white p-2 text-xs" />
                                ) : null}
                                <p className="text-xs text-emerald-800">
                                    Após a confirmação do PixGo, seu plano será ativado automaticamente.
                                </p>
                            </div>
                        )}
                    </aside>
                </div>
            </main>
        </div>
    );
}
