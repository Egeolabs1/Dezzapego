import { ArrowLeft, ShieldCheck, AlertTriangle, Eye, CreditCard, MapPin, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import SEO from '../../components/SEO';

export default function SafetyTips() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50">
            <SEO
                title="Dicas de Segurança"
                description="Guia de segurança para comprar e vender no Dezzapego. Saiba como se proteger de golpes."
            />
            <Header />

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Voltar para a Home
                </button>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-8 md:p-12">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-green-100 rounded-full text-green-600">
                                <ShieldCheck className="w-8 h-8" />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                                Dicas de Segurança
                            </h1>
                        </div>

                        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                            O Dezzapego quer que você faça ótimos negócios com segurança. Reunimos aqui as principais recomendações para você comprar e vender tranquilamente.
                        </p>

                        <div className="space-y-8">

                            {/* ALERTA PRINCIPAL */}
                            <section className="bg-amber-50 p-6 rounded-xl border border-amber-100">
                                <div className="flex items-center gap-3 mb-4">
                                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                                    <h2 className="text-xl font-bold text-amber-800 m-0">Regra de Ouro</h2>
                                </div>
                                <p className="font-medium text-gray-900 text-lg">
                                    NUNCA faça pagamentos antecipados (Pix, Transferência, Depósito) antes de ver o produto pessoalmente e conferir se está tudo certo.
                                </p>
                            </section>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Para Compradores */}
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                        <Eye className="w-6 h-6 text-blue-600" />
                                        Para Compradores
                                    </h2>

                                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
                                        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-gray-500" />
                                            Encontros Públicos
                                        </h3>
                                        <p className="text-gray-600 text-sm">
                                            Prefira sempre marcar encontros em locais públicos e movimentados, como shoppings, praças de alimentação ou estações de metrô. Evite ir à casa de desconhecidos sozinho.
                                        </p>
                                    </div>

                                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
                                        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                            <Eye className="w-4 h-4 text-gray-500" />
                                            Teste na Hora
                                        </h3>
                                        <p className="text-gray-600 text-sm">
                                            Verifique o produto detalhadamente no momento da entrega. Se for eletrônico, ligue, teste as funções e confira se condiz com o anúncio.
                                        </p>
                                    </div>

                                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
                                        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-gray-500" />
                                            Desconfie de 'Preço Baixo'
                                        </h3>
                                        <p className="text-gray-600 text-sm">
                                            Ofertas muito abaixo do mercado "milagrosas" costumam ser isca para golpes ou produtos defeituosos/roubados.
                                        </p>
                                    </div>
                                </div>

                                {/* Para Vendedores */}
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                        <CreditCard className="w-6 h-6 text-green-600" />
                                        Para Vendedores
                                    </h2>

                                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
                                        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-gray-500" />
                                            Pagamento Seguro
                                        </h3>
                                        <p className="text-gray-600 text-sm">
                                            Só entregue o produto após confirmar o recebimento do dinheiro. No caso de transferência, confira no SEU extrato bancário, não confie apenas no comprovante mostrado.
                                        </p>
                                    </div>

                                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
                                        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                            <MessageCircle className="w-4 h-4 text-gray-500" />
                                            Chat da Plataforma
                                        </h3>
                                        <p className="text-gray-600 text-sm">
                                            Mantenha as conversas preferencialmente pelo chat do site até sentir segurança para passar seu número pessoal.
                                        </p>
                                    </div>

                                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
                                        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-gray-500" />
                                            Golpe do 'Intermediário'
                                        </h3>
                                        <p className="text-gray-600 text-sm">
                                            Cuidado se alguém pedir para você não falar sobre o preço ou detalhes com a pessoa que vai retirar o produto. Isso é característica comum de golpe de triangulação.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <section className="mt-8 pt-8 border-t border-gray-100">
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Viu algo suspeito?</h2>
                                <p className="text-gray-600 mb-4">
                                    Se você identificar um anúncio falso ou comportamento suspeito, denuncie imediatamente através do botão "Denunciar" presente em todos os anúncios.
                                </p>
                                <button
                                    onClick={() => navigate('/contato')} // Assuming we might have this or just generic action
                                    className="text-blue-600 font-medium hover:underline"
                                >
                                    Fale com nosso suporte
                                </button>
                            </section>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
