import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Check, Star, Zap, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import SEO from '../../components/SEO';
import { useAuth } from '../contexts/AuthContext';

type AccountPlan = {
    id: string;
    name: string;
    description: string;
    price_cents?: number;
    currency?: string;
    price_label: string;
    period_label: string;
    features: string[];
    button_text: string;
    button_link: string;
    max_active_ads?: number | null;
    max_photos_per_ad?: number;
    monthly_featured_ads?: number;
    highlighted: boolean;
    icon_name: string;
    sort_order: number;
    active: boolean;
};

function getAutomaticButtonLink(plan: Pick<AccountPlan, 'id' | 'price_cents'>) {
    if ((plan.price_cents || 0) <= 0) return '/register';
    return `/register?plan=${encodeURIComponent(plan.id)}`;
}

function getPlanActionLink(plan: AccountPlan, isLoggedIn: boolean, authLoading: boolean) {
    const configuredLink = (plan.button_link || '').trim() || getAutomaticButtonLink(plan);

    if (!isLoggedIn && !authLoading) return configuredLink;

    if (configuredLink === '/register') return '/anunciar';
    if (configuredLink.startsWith('/register?')) {
        const query = configuredLink.split('?')[1] || `plan=${encodeURIComponent(plan.id)}`;
        return `/checkout/plano?${query}`;
    }

    return configuredLink;
}

export default function Plans() {
    const { user, loading: authLoading } = useAuth();
    const [plans, setPlans] = useState<AccountPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    async function fetchPlans() {
        try {
            const { data, error } = await supabase
                .from('account_plans')
                .select('*')
                .eq('active', true)
                .order('sort_order', { ascending: true });

            if (error) {
                if (error.code !== 'PGRST116') console.error('Error fetching plans:', error);
                setLoadError(true);
                return;
            }

            if (data && data.length > 0) {
                setPlans(data as AccountPlan[]);
            } else {
                setLoadError(true);
            }
        } catch (err) {
            console.error('Unexpected error fetching plans:', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }

    const getIcon = (name: string) => {
        switch (name) {
            case 'Star': return Star;
            case 'Shield': return Shield;
            case 'Zap':
            default: return Zap;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <SEO title="Planos e Preços" description="Escolha o plano ideal para vender mais no Dezzapego." />
            <Header />

            <main className="flex-grow container mx-auto px-4 py-12">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
                        Escolha o plano ideal para você
                    </h1>
                    <p className="text-xl text-gray-600">
                        Venda mais rápido com nossos recursos premium e ferramentas exclusivas.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {loading ? (
                        [0, 1, 2].map((item) => (
                            <div
                                key={item}
                                className="relative rounded-2xl bg-white p-8 shadow-lg border border-gray-100"
                            >
                                <div className="mb-6">
                                    <div className="w-12 h-12 rounded-lg bg-gray-100 animate-pulse mb-4" />
                                    <div className="h-7 w-28 rounded bg-gray-100 animate-pulse" />
                                    <div className="mt-3 h-4 w-48 rounded bg-gray-100 animate-pulse" />
                                </div>
                                <div className="mb-6 h-10 w-36 rounded bg-gray-100 animate-pulse" />
                                <div className="space-y-4 mb-8">
                                    {[0, 1, 2, 3].map((line) => (
                                        <div key={line} className="flex items-start gap-3">
                                            <div className="h-5 w-5 shrink-0 rounded bg-gray-100 animate-pulse" />
                                            <div className="h-4 w-full rounded bg-gray-100 animate-pulse" />
                                        </div>
                                    ))}
                                </div>
                                <div className="h-12 w-full rounded-lg bg-gray-100 animate-pulse" />
                            </div>
                        ))
                    ) : loadError ? (
                        <div className="md:col-span-3 rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
                            <h2 className="text-xl font-bold text-gray-900">Planos indisponíveis no momento</h2>
                            <p className="mt-2 text-gray-600">
                                Não foi possível carregar os valores atualizados. Tente novamente em instantes.
                            </p>
                        </div>
                    ) : plans.map((plan) => {
                        const Icon = getIcon(plan.icon_name);
                        return (
                            <div
                                key={plan.id}
                                className={`relative rounded-2xl bg-white p-8 shadow-lg transition-all hover:shadow-xl ${plan.highlighted ? 'ring-2 ring-blue-600 md:scale-105 z-10' : 'border border-gray-100'
                                    }`}
                            >
                                {plan.highlighted && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                                        Mais Popular
                                    </div>
                                )}

                                <div className="mb-6">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${plan.highlighted ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                                    <p className="text-gray-500 mt-2">{plan.description}</p>
                                </div>

                                <div className="mb-6">
                                    <span className="text-4xl font-bold text-gray-900">{plan.price_label}</span>
                                    <span className="text-gray-500">{plan.period_label}</span>
                                </div>

                                <ul className="space-y-4 mb-8">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <Check className={`w-5 h-5 shrink-0 ${plan.highlighted ? 'text-blue-600' : 'text-gray-400'
                                                }`} />
                                            <span className="text-gray-600 text-sm">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Link
                                    to={getPlanActionLink(plan, Boolean(user), authLoading)}
                                    className={`block w-full py-3 px-6 rounded-lg text-center font-medium transition-colors ${plan.highlighted
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                                        }`}
                                >
                                    {plan.button_text}
                                </Link>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-20 text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Dúvidas frequentes</h2>
                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left mt-8">
                        <div className="bg-white p-6 rounded-lg border border-gray-100">
                            <h3 className="font-semibold text-lg mb-2">Posso cancelar a qualquer momento?</h3>
                            <p className="text-gray-600">Sim, não há fidelidade nos planos mensais. Você pode cancelar quando quiser.</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg border border-gray-100">
                            <h3 className="font-semibold text-lg mb-2">Como funciona o destaque?</h3>
                            <p className="text-gray-600">Seus anúncios aparecem no topo das buscas e na página inicial, recebendo até 3x mais visualizações.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
