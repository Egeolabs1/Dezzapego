import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Check, Star, Zap, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';

export default function Plans() {
    const plans = [
        {
            name: 'Grátis',
            price: 'R$ 0',
            period: '/mês',
            description: 'Para quem está começando a desapegar.',
            features: [
                'Até 5 anúncios ativos',
                '3 fotos por anúncio',
                'Chat com compradores',
                'Suporte básico'
            ],
            buttonText: 'Começar Grátis',
            buttonLink: '/register',
            highlighted: false,
            icon: Zap
        },
        {
            name: 'Pro',
            price: 'R$ 29,90',
            period: '/mês',
            description: 'Para quem vende com frequência.',
            features: [
                'Até 50 anúncios ativos',
                '10 fotos por anúncio',
                'Destaque em 2 anúncios/mês',
                'Suporte prioritário',
                'Estatísticas detalhadas'
            ],
            buttonText: 'Assinar Pro',
            buttonLink: '/register?plan=pro',
            highlighted: true,
            icon: Star
        },
        {
            name: 'Empresa',
            price: 'R$ 89,90',
            period: '/mês',
            description: 'Para lojas e pequenos negócios.',
            features: [
                'Anúncios ilimitados',
                '20 fotos por anúncio',
                'Destaque em 10 anúncios/mês',
                'Perfil verificado (Selo)',
                'Painel de gestão avançado',
                'Integração via API (Em breve)'
            ],
            buttonText: 'Falar com Comercial',
            buttonLink: '/contato',
            highlighted: false,
            icon: Shield
        }
    ];

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
                    {plans.map((plan) => {
                        const Icon = plan.icon;
                        return (
                            <div
                                key={plan.name}
                                className={`relative rounded-2xl bg-white p-8 shadow-lg transition-all hover:shadow-xl ${plan.highlighted ? 'ring-2 ring-blue-600 scale-105 z-10' : 'border border-gray-100'
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
                                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                                    <span className="text-gray-500">{plan.period}</span>
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
                                    to={plan.buttonLink}
                                    className={`block w-full py-3 px-6 rounded-lg text-center font-medium transition-colors ${plan.highlighted
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                                        }`}
                                >
                                    {plan.buttonText}
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

            <Footer />
        </div>
    );
}
