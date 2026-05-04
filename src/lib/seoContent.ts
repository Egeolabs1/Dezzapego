export type SeoLocation = {
    city: string;
    state: string;
    stateSlug: string;
    citySlug: string;
};

export type SeoGuide = {
    slug: string;
    title: string;
    description: string;
    intro: string;
    sections: { heading: string; body: string }[];
    keywords: string[];
};

export const SEO_LOCATIONS: SeoLocation[] = [
    { city: 'São Paulo', state: 'SP', stateSlug: 'sp', citySlug: 'sao-paulo' },
    { city: 'Rio de Janeiro', state: 'RJ', stateSlug: 'rj', citySlug: 'rio-de-janeiro' },
    { city: 'Belo Horizonte', state: 'MG', stateSlug: 'mg', citySlug: 'belo-horizonte' },
    { city: 'Curitiba', state: 'PR', stateSlug: 'pr', citySlug: 'curitiba' },
    { city: 'Porto Alegre', state: 'RS', stateSlug: 'rs', citySlug: 'porto-alegre' },
    { city: 'Salvador', state: 'BA', stateSlug: 'ba', citySlug: 'salvador' },
    { city: 'Recife', state: 'PE', stateSlug: 'pe', citySlug: 'recife' },
    { city: 'Fortaleza', state: 'CE', stateSlug: 'ce', citySlug: 'fortaleza' },
    { city: 'Brasília', state: 'DF', stateSlug: 'df', citySlug: 'brasilia' },
    { city: 'Goiânia', state: 'GO', stateSlug: 'go', citySlug: 'goiania' },
    { city: 'Campinas', state: 'SP', stateSlug: 'sp', citySlug: 'campinas' },
    { city: 'Florianópolis', state: 'SC', stateSlug: 'sc', citySlug: 'florianopolis' },
];

export const SEO_GUIDES: SeoGuide[] = [
    {
        slug: 'como-vender-com-seguranca',
        title: 'Como vender com segurança em classificados online',
        description:
            'Boas práticas para vender itens usados com segurança: fotos, descrição, conversa com comprador, encontro e pagamento.',
        intro:
            'Vender online fica mais simples quando o anúncio é claro e a negociação acontece com cuidado. Este guia reúne práticas básicas para reduzir dúvidas, evitar golpes e aumentar a confiança do comprador.',
        keywords: ['vender com segurança', 'classificados online', 'golpes em anúncios', 'vender usado'],
        sections: [
            {
                heading: 'Monte um anúncio verificável',
                body:
                    'Use fotos próprias, informe marcas, medidas, estado de conservação e detalhes que comprovem que o item existe. Quanto mais específico for o anúncio, menor a chance de conversas improdutivas.',
            },
            {
                heading: 'Converse dentro de canais confiáveis',
                body:
                    'Desconfie de mensagens apressadas, comprovantes enviados antes de qualquer acordo e pedidos para clicar em links externos. Combine tudo com calma e mantenha registros da conversa.',
            },
            {
                heading: 'Prefira entrega segura',
                body:
                    'Para produtos de maior valor, marque em local público e movimentado. Só entregue o item após confirmar o pagamento no aplicativo do banco ou após receber o valor em espécie.',
            },
        ],
    },
    {
        slug: 'cuidados-ao-comprar-carro-usado',
        title: 'Cuidados ao comprar carro usado',
        description:
            'Checklist para avaliar carro usado: documentação, histórico, vistoria, quilometragem, pneus, motor e negociação.',
        intro:
            'Comprar carro usado exige atenção ao estado do veículo e à documentação. Antes de fechar negócio, vale conferir sinais mecânicos, histórico e custos futuros.',
        keywords: ['comprar carro usado', 'carro usado', 'vistoria veicular', 'documentação veículo'],
        sections: [
            {
                heading: 'Confira documentação e histórico',
                body:
                    'Verifique se há multas, débitos, restrições, alienação ou divergência entre dados do veículo e documentos apresentados pelo vendedor.',
            },
            {
                heading: 'Faça uma vistoria cuidadosa',
                body:
                    'Observe pneus, pintura, alinhamento de portas, vazamentos, ruídos, funcionamento de itens elétricos e registros de manutenção. Uma vistoria cautelar ajuda em compras de maior valor.',
            },
            {
                heading: 'Negocie com base em fatos',
                body:
                    'Compare preços de veículos parecidos, considere reparos necessários e evite pagamentos antecipados antes de confirmar procedência e transferência.',
            },
        ],
    },
    {
        slug: 'como-anunciar-imovel',
        title: 'Como anunciar imóvel para venda ou aluguel',
        description:
            'Dicas para criar anúncio de imóvel com boas fotos, localização clara, medidas, valores e informações que ajudam compradores e inquilinos.',
        intro:
            'Um bom anúncio de imóvel precisa responder rapidamente às principais dúvidas: localização, tipo, tamanho, estado, custos e condições de negociação.',
        keywords: ['anunciar imóvel', 'vender imóvel', 'alugar imóvel', 'classificados imóveis'],
        sections: [
            {
                heading: 'Mostre os ambientes com clareza',
                body:
                    'Publique fotos bem iluminadas de sala, quartos, cozinha, banheiro, fachada e áreas comuns. Evite imagens muito escuras ou repetidas.',
            },
            {
                heading: 'Informe custos e características',
                body:
                    'Inclua metragem, quartos, banheiros, vaga, condomínio, IPTU, tipo de contrato e pontos próximos importantes, como transporte e comércio.',
            },
            {
                heading: 'Use um título direto',
                body:
                    'Títulos como “Apartamento 2 quartos em Curitiba com vaga” ajudam a pessoa e os mecanismos de busca a entenderem o anúncio rapidamente.',
            },
        ],
    },
    {
        slug: 'como-tirar-fotos-para-vender-mais',
        title: 'Como tirar fotos melhores para vender mais rápido',
        description:
            'Aprenda a fotografar produtos usados para anúncios: luz, fundo, ângulos, detalhes, defeitos e organização das imagens.',
        intro:
            'Fotos boas aumentam confiança e reduzem perguntas repetidas. Não é preciso equipamento profissional: luz natural, fundo limpo e detalhes honestos já ajudam muito.',
        keywords: ['fotos para anúncio', 'vender mais rápido', 'produto usado', 'anúncio online'],
        sections: [
            {
                heading: 'Use luz natural e fundo simples',
                body:
                    'Fotografe perto de uma janela ou em ambiente claro. Um fundo neutro evita distrações e destaca o item anunciado.',
            },
            {
                heading: 'Mostre detalhes e estado real',
                body:
                    'Inclua fotos de frente, laterais, etiquetas, acessórios e marcas de uso. Ser transparente evita frustração e aumenta credibilidade.',
            },
            {
                heading: 'Organize a primeira imagem',
                body:
                    'A primeira foto aparece nas listagens. Escolha a imagem mais clara, com o produto inteiro visível e sem excesso de texto ou montagem.',
            },
        ],
    },
];

export function getSeoLocation(stateSlug?: string, citySlug?: string): SeoLocation | undefined {
    return SEO_LOCATIONS.find(
        (location) => location.stateSlug === stateSlug && location.citySlug === citySlug,
    );
}

export function getSeoGuide(slug?: string): SeoGuide | undefined {
    return SEO_GUIDES.find((guide) => guide.slug === slug);
}
