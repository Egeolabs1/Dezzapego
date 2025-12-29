import { ArrowLeft, Lock, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import SEO from '../../components/SEO';

export default function PrivacyPolicy() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50">
            <SEO
                title="Política de Privacidade"
                description="Política de Privacidade do dezzapego.com"
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
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
                            Política de Privacidade
                        </h1>

                        <div className="prose prose-blue max-w-none text-gray-600 space-y-8">

                            <section className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                                <div className="flex items-center gap-3 mb-4">
                                    <Shield className="w-6 h-6 text-blue-600" />
                                    <h2 className="text-xl font-bold text-blue-800 m-0">Compromisso com a Segurança</h2>
                                </div>
                                <p className="font-medium text-gray-900">
                                    O Dezzapego leva a sua privacidade a sério. Esta política descreve como coletamos, usamos e protegemos suas informações pessoais.
                                </p>
                            </section>

                            <section>
                                <div className="flex items-center gap-3 mb-4">
                                    <Lock className="w-6 h-6 text-purple-600" />
                                    <h2 className="text-2xl font-bold text-gray-900 m-0">1. Coleta e Uso de Dados</h2>
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 mt-4">1.1. Informações que Coletamos</h3>
                                <p>Coletamos informações estritamente necessárias para o funcionamento da plataforma:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Informações de cadastro: Nome, E-mail, Telefone/WhatsApp.</li>
                                    <li>Informações de anúncios: Fotos, descrições e dados técnicos dos produtos.</li>
                                    <li>Logs de acesso: Endereço IP e dados do navegador (para segurança).</li>
                                </ul>

                                <h3 className="text-lg font-bold text-gray-900 mt-4">1.2. Como Usamos seus Dados</h3>
                                <p>Utilizamos seus dados para:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Gerenciar sua conta e permitir que você crie e gerencie anúncios.</li>
                                    <li>Facilitar o contato entre compradores e vendedores (seu telefone pode ser exibido se você permitir).</li>
                                    <li>Melhorar a segurança do site e prevenir fraudes.</li>
                                    <li>Enviar notificações importantes sobre sua conta ou o serviço.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Compartilhamento e Publicidade</h2>

                                <h3 className="text-lg font-bold text-gray-900 mt-4">2.1. Visibilidade Pública</h3>
                                <p>Ao criar um anúncio, as informações do produto e seu nome de contato tornam-se públicos. Seu e-mail NUNCA é exibido publicamente.</p>

                                <h3 className="text-lg font-bold text-gray-900 mt-4">2.2. Serviços de Terceiros</h3>
                                <p>Utilizamos serviços de terceiros que podem coletar dados anonimizados:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Google Analytics:</strong> Para entender como o site é utilizado.</li>
                                    <li><strong>Google AdSense:</strong> Para exibir publicidade. O Google utiliza cookies para exibir anúncios com base em suas visitas anteriores.</li>
                                </ul>
                                <p className="mt-2">Você pode optar por desativar a publicidade personalizada nas <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Configurações de Anúncios do Google</a>.</p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Seus Direitos</h2>
                                <p>Você tem total controle sobre seus dados:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Acesso e Correção:</strong> Você pode acessar e editar seus dados a qualquer momento através do seu Perfil.</li>
                                    <li><strong>Exclusão:</strong> Você pode excluir seus anúncios a qualquer momento. Para excluir sua conta permanentemente, entre em contato conosco ou utilize a opção na área de configurações.</li>
                                </ul>
                            </section>

                            <div className="pt-8 text-center text-sm text-gray-500">
                                <p>Última atualização: Dezembro de 2025</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
