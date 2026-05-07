import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, Loader2, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import SEO from '../../components/SEO';
import { createAccountPlanPayment } from '../../lib/accountPlanPayments';
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
            const result = await createAccountPlanPayment(plan.id, provider);
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
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setProvider('stripe')}
                                className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-semibold ${provider === 'stripe' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700'}`}
                            >
                                <CreditCard className="h-4 w-4" />
                                Stripe
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
                            {provider === 'stripe' ? 'Ir para Stripe' : 'Gerar PIX'}
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
