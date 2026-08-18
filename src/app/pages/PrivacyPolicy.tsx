import { ArrowLeft, Lock, Shield, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Header } from '../components/Header';
import SEO from '../../components/SEO';
import { CONSENT_POLICY_VERSION } from '../../lib/privacyConsent';

export default function PrivacyPolicy() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50">
            <SEO title="Política de Privacidade" description="Política de Privacidade do dezzapego.com — LGPD" />
            <Header />

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Voltar para a Home
                </button>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-8 md:p-12">
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Política de Privacidade</h1>
                        <p className="text-sm text-gray-500 mb-8">
                            Versão do consentimento de cookies (referência): {CONSENT_POLICY_VERSION} — texto jurídico
                            orientativo; não substitui assessoria jurídica.
                        </p>

                        <div className="prose prose-blue max-w-none text-gray-600 space-y-8">
                            <section className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                                <div className="flex items-center gap-3 mb-4">
                                    <Shield className="w-6 h-6 text-blue-600" />
                                    <h2 className="text-xl font-bold text-blue-800 m-0">Compromisso (LGPD)</h2>
                                </div>
                                <p className="font-medium text-gray-900 m-0">
                                    O Dezzapego trata dados pessoais em conformidade com a Lei nº 13.709/2018 (LGPD),
                                    com transparência, finalidade específica e medidas de segurança adequadas ao risco.
                                </p>
                            </section>

                            <section>
                                <div className="flex items-center gap-3 mb-4">
                                    <Lock className="w-6 h-6 text-purple-600" />
                                    <h2 className="text-2xl font-bold text-gray-900 m-0">1. Controlador e encarregado (DPO)</h2>
                                </div>
                                <p>
                                    <strong>Controlador:</strong> responsável pela plataforma Dezzapego (dados de cadastro,
                                    anúncios e uso do site).
                                </p>
                                <p className="mt-2 flex items-start gap-2">
                                    <Mail className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                                    <span>
                                        <strong>Encarregado de dados (DPO) / contato LGPD:</strong>{' '}
                                        <a href="/contato" className="text-blue-600 hover:underline">
                                            use o formulário em Fale conosco
                                        </a>{' '}
                                        ou o e-mail indicado nessa página (substitua pelo canal oficial da sua operação).
                                    </span>
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Bases legais (art. 7º LGPD)</h2>
                                <p>Tratamos dados com base em, conforme o caso:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>
                                        <strong>Execução de contrato ou procedimentos preliminares</strong> — cadastro,
                                        publicação de anúncios e funcionalidades essenciais da conta.
                                    </li>
                                    <li>
                                        <strong>Legítimo interesse</strong> — segurança, prevenção a fraudes, métricas
                                        agregadas de uso (quando aceitas no banner de cookies), melhoria do serviço,
                                        resposta a incidentes.
                                    </li>
                                    <li>
                                        <strong>Cumprimento de obrigação legal ou regulatória</strong> — quando exigido por
                                        lei ou ordem competente.
                                    </li>
                                    <li>
                                        <strong>Consentimento</strong> — para cookies/medição não estritamente necessária
                                        e outras finalidades opcionais indicadas no momento da coleta.
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Dados coletados e finalidades</h2>
                                <h3 className="text-lg font-bold text-gray-900 mt-4">3.1. Cadastro e perfil</h3>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Nome, e-mail, telefone, localização informada, bio, links e documentos de verificação
                                        quando você os envia.</li>
                                </ul>
                                <h3 className="text-lg font-bold text-gray-900 mt-4">3.2. Anúncios e mídia</h3>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Textos, preços, categorias e imagens publicados por você.</li>
                                </ul>
                                <h3 className="text-lg font-bold text-gray-900 mt-4">3.3. Uso do site e segurança</h3>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>
                                        <strong>Endereço IP:</strong> registramos o IP público associado ao cadastro e
                                        atualizamos registro de último acesso em intervalos controlados enquanto você
                                        usa o site autenticado (medição via serviço externo no navegador; a data de
                                        criação da conta continua no campo <code className="text-xs bg-gray-100 px-1 rounded">created_at</code> do perfil).
                                    </li>
                                    <li>Logs técnicos (ex.: IP, agente do navegador, rotas acessadas) para segurança e
                                        diagnóstico.</li>
                                    <li>
                                        Registro agregado de visitas às páginas somente se você aceitar &quot;estatísticas
                                        de uso&quot; no banner de cookies.
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Cookies, armazenamento local e consentimento</h2>
                                <p>
                                    Utilizamos armazenamento local e cookies estritamente necessários ao funcionamento
                                    (sessão, preferências). Outras medições dependem do seu consentimento, gerenciável pelo
                                    banner e pelo link &quot;Cookies e preferências&quot; no rodapé.
                                </p>
                                <p className="mt-2">
                                    Serviços de terceiros (ex.: hospedagem, analytics de terceiros) podem aplicar suas
                                    próprias políticas; recomendamos consultar as configurações do provedor quando
                                    integrados.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Publicidade e Google AdSense</h2>
                                <p>
                                    O Dezzapego pode exibir anúncios de terceiros, inclusive por meio do Google AdSense.
                                    Esses parceiros podem usar cookies, identificadores de dispositivo e sinais de
                                    consentimento para medir anúncios, limitar frequência, prevenir fraude e, quando você
                                    autorizar, personalizar publicidade.
                                </p>
                                <p className="mt-2">
                                    Você pode gerenciar preferências no banner de cookies do site. Também é possível
                                    ajustar preferências diretamente nas{' '}
                                    <a
                                        href="https://adssettings.google.com/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                    >
                                        Configurações de anúncios do Google
                                    </a>{' '}
                                    e consultar como o Google utiliza dados em{' '}
                                    <a
                                        href="https://policies.google.com/technologies/partner-sites"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                    >
                                        sites e apps de parceiros
                                    </a>
                                    .
                                </p>
                                <p className="mt-2">
                                    Se o site passar a veicular anúncios para usuários no Espaço Econômico Europeu,
                                    Reino Unido ou Suíça, poderemos usar uma plataforma de gestão de consentimento
                                    certificada pelo Google para atender aos requisitos locais aplicáveis.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Compartilhamento</h2>
                                <p>
                                    Dados de anúncio e de perfil público ficam visíveis conforme as regras da plataforma.
                                    Seu e-mail de login não é exibido publicamente como contato, salvo onde você
                                    optar por expor um e-mail de negócio.
                                </p>
                                <p className="mt-2">
                                    Podemos compartilhar dados com provedores que nos auxiliam a operar o serviço
                                    (infraestrutura, e-mail transacional, pagamentos), sob contratos e minimização de dados.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Direitos do titular (arts. 18 e 19 LGPD)</h2>
                                <p>Você pode, conforme a lei:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>
                                        <strong>Confirmação e acesso</strong> — saber se tratamos seus dados e obter cópia
                                        (incluindo exportação em formato estruturado na área da conta, quando disponível).
                                    </li>
                                    <li>
                                        <strong>Correção</strong> — atualizar dados incompletos, inexatos ou desatualizados
                                        no painel da conta.
                                    </li>
                                    <li>
                                        <strong>Anonimização, bloqueio ou eliminação</strong> — inclusive exclusão da conta
                                        pelos fluxos indicados no site; podem permanecer dados mínimos quando houver base
                                        legal (vide retenção abaixo).
                                    </li>
                                    <li>
                                        <strong>Portabilidade</strong> — receber dados que você forneceu, em formato
                                        interoperável, quando aplicável.
                                    </li>
                                    <li>
                                        <strong>Informação sobre compartilhamento</strong> e sobre o consentimento, quando
                                        for a base utilizada.
                                    </li>
                                    <li>
                                        <strong>Revogação do consentimento</strong> — quando o tratamento depender dele,
                                        pelo banner ou contato, sem prejudicar tratamentos anteriores lícitos.
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Retenção e backups</h2>
                                <p>
                                    Mantemos dados pelo tempo necessário à finalidade e às obrigações legais. Após exclusão
                                    da conta ou eliminação solicitada, podemos reter por prazo limitado registros mínimos
                                    (ex.: logs de segurança, evidências de transação ou disputa) com base legal adequada
                                    (arts. 7º e 16º LGPD), com minimização e prazo compatível com a finalidade.
                                </p>
                                <p className="mt-2">
                                    Backups podem conter cópias residuais por um período técnico até rotação natural;
                                    apagamos ou anonimizamos quando possível após esse ciclo.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Segurança</h2>
                                <p>
                                    Adotamos medidas técnicas e administrativas para proteger dados contra acessos não
                                    autorizados, perda acidental ou ilícita. Nenhum sistema é 100% invulnerável; em caso de
                                    incidente relevante, comunicaremos quando a lei exigir.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Alterações desta política</h2>
                                <p>
                                    Podemos atualizar este texto; a data abaixo indica a última revisão relevante. Mudanças
                                    materiais em cookies podem exigir novo consentimento, refletido na versão do banner.
                                </p>
                            </section>

                            <div className="pt-8 text-center text-sm text-gray-500 border-t border-gray-100">
                                <p>Última atualização: abril de 2026</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
