import { ArrowLeft, Shield, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import SEO from '../../components/SEO';

export default function Terms() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50">
            <SEO
                title="Termos de Uso e Privacidade"
                description="Termos de uso, política de privacidade e isenção de responsabilidade do Dezzapego."
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
                            Termos de Uso
                        </h1>

                        <div className="prose prose-blue max-w-none text-gray-600 space-y-8">

                            {/* ISENÇÃO DE RESPONSABILIDADE - CRÍTICO */}
                            <section className="bg-red-50 p-6 rounded-xl border border-red-100">
                                <div className="flex items-center gap-3 mb-4">
                                    <Shield className="w-6 h-6 text-red-600" />
                                    <h2 className="text-xl font-bold text-red-700 m-0">1. Isenção de Responsabilidade (Disclaimer)</h2>
                                </div>
                                <p className="font-medium text-gray-900">
                                    O Dezzapego.com atua exclusivamente como uma plataforma de classificados online, conectando anunciantes e interessados.
                                </p>
                                <ul className="list-disc pl-5 space-y-2 mt-4 text-gray-800">
                                    <li><strong>Não intermediamos pagamentos:</strong> Toda transação é feita diretamente entre comprador e vendedor. Não processamos, garantimos ou nos responsabilizamos por pagamentos.</li>
                                    <li><strong>Não garantimos produtos:</strong> Não verificamos a existência, qualidade, segurança ou legalidade dos itens anunciados.</li>
                                    <li><strong>Não garantimos a veracidade:</strong> A responsabilidade pelas informações dos anúncios é inteiramente dos anunciantes.</li>
                                    <li><strong>Golpes e Fraudes:</strong> O site não se responsabiliza por perdas, danos ou golpes sofridos por usuários. Recomendamos fortemente a leitura de nossas dicas de segurança.</li>
                                </ul>
                                <p className="mt-4 text-sm text-red-800 font-bold">
                                    AO UTILIZAR O SITE, VOCÊ CONCORDA QUE O DEZZAPEGO NÃO TEM QUALQUER RESPONSABILIDADE SOBRE AS NEGOCIAÇÕES, PRODUTOS OU CONDUTA DOS USUÁRIOS.
                                </p>
                            </section>

                            <section>
                                <div className="flex items-center gap-3 mb-4">
                                    <FileText className="w-6 h-6 text-blue-600" />
                                    <h2 className="text-2xl font-bold text-gray-900 m-0">2. Termos de Uso</h2>
                                </div>
                                <p>
                                    Ao acessar e utilizar o Dezzapego, você aceita e concorda em cumprir os seguintes termos:
                                </p>
                                <h3 className="text-lg font-bold text-gray-900 mt-4">2.1. Elegibilidade</h3>
                                <p>Você deve ter pelo menos 18 anos para utilizar nossos serviços e criar anúncios.</p>

                                <h3 className="text-lg font-bold text-gray-900 mt-4">2.2. Conteúdo Proibido</h3>
                                <p>É estritamente proibido anunciar:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Armas de fogo, munição e materiais explosivos.</li>
                                    <li>Drogas, narcóticos e medicamentos controlados.</li>
                                    <li>Animais silvestres ou em extinção.</li>
                                    <li>Produtos falsificados ou pirateados.</li>
                                    <li>Conteúdo adulto, pornográfico ou explícito.</li>
                                    <li>Itens roubados ou de origem ilícita.</li>
                                </ul>
                                <p>O Dezzapego se reserva o direito de remover qualquer anúncio que viole estas regras e banir o usuário responsável, sem aviso prévio.</p>
                            </section>

                            <section className="bg-gray-50 p-6 rounded-xl border border-gray-200 mt-8">
                                <h2 className="text-xl font-bold text-gray-900 mb-4">3. Dicas de Segurança para Negócios</h2>
                                <p className="mb-4">Para sua segurança, siga sempre estas recomendações:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Nunca pague antecipadamente:</strong> Não faça depósitos ou transferências antes de ver o produto.</li>
                                    <li><strong>Encontros em locais públicos:</strong> Trate de negociações em lugares movimentados e seguros (shoppings, praças).</li>
                                    <li><strong>Desconfie de ofertas milagrosas:</strong> Preços muito abaixo do mercado geralmente indicam golpe ou produto com defeito.</li>
                                    <li><strong>Teste o produto:</strong> Verifique o funcionamento do item antes de fechar negócio.</li>
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
