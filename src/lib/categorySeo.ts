import { CATEGORIES } from '../app/data/categories';
import type { Ad } from '../types';
import { getSiteOrigin, SITE_NAME, toAbsoluteUrl } from './seo';

export type CategorySeoBlock = {
    listingTitle: string;
    metaDescription: string;
    keywords: string[];
};

/** Metadados por categoria principal — alinhados às chaves em `categories.ts` / `CATEGORIES` */
export const CATEGORY_SEO: Record<string, CategorySeoBlock> = {
    Imóveis: {
        listingTitle: 'Imóveis — compra, venda e aluguel',
        metaDescription:
            'Casas, apartamentos, terrenos, temporada e lançamentos. Filtre por cidade, tipo de negócio, área útil e preço nos classificados do Dezzapego.',
        keywords: ['imóveis', 'apartamento', 'casa', 'aluguel', 'venda', 'terreno', 'temporada', 'classificados'],
    },
    'Autos e Peças': {
        listingTitle: 'Carros, motos, caminhões e peças',
        metaDescription:
            'Veículos novos e usados, motos, náutica e peças. Encontre ofertas por modelo, ano e preço ou anuncie grátis no Dezzapego.',
        keywords: ['carros', 'motos', 'veículos', 'peças automotivas', 'classificados de carros'],
    },
    'Para a sua Casa': {
        listingTitle: 'Casa e construção — móveis e utilidades',
        metaDescription:
            'Móveis, eletrodomésticos, materiais de construção, decoração e jardim. Compre perto de você ou venda sem complicação.',
        keywords: ['móveis', 'eletrodomésticos', 'construção', 'decoração', 'casa'],
    },
    'Eletrônicos e Celulares': {
        listingTitle: 'Eletrônicos, celulares e informática',
        metaDescription:
            'Smartphones, notebooks, TVs, áudio, games e drones. Compare preços e anuncie seus eletrônicos com segurança.',
        keywords: ['celular', 'notebook', 'TV', 'videogame', 'eletrônicos'],
    },
    'Música e Hobbies': {
        listingTitle: 'Música, hobbies e coleções',
        metaDescription:
            'Instrumentos, livros, filmes, brinquedos, artes e colecionáveis. Doe ou encontre itens únicos no Dezzapego.',
        keywords: ['instrumentos musicais', 'livros', 'hobbies', 'coleções', 'brinquedos'],
    },
    'Esportes e Lazer': {
        listingTitle: 'Esportes, lazer e outdoor',
        metaDescription:
            'Equipamentos esportivos, bike, camping, pesca e skate. Ideal para treinar ou aproveitar o fim de semana.',
        keywords: ['esportes', 'bicicleta', 'camping', 'academia', 'lazer'],
    },
    'Moda e Beleza': {
        listingTitle: 'Moda, beleza e acessórios',
        metaDescription:
            'Roupas, calçados, bolsas, cosméticos e artigos infantis. Novo e seminovo com ótimo custo-benefício.',
        keywords: ['moda', 'roupas', 'beleza', 'calçados', 'acessórios'],
    },
    'Agro e Indústria': {
        listingTitle: 'Agro, indústria e equipamentos',
        metaDescription:
            'Máquinas agrícolas, animais de fazenda, equipamentos industriais e escritório. Conecte compradores e vendedores B2B e rural.',
        keywords: ['agro', 'trator', 'máquinas', 'indústria', 'fazenda'],
    },
    Serviços: {
        listingTitle: 'Serviços profissionais e reformas',
        metaDescription:
            'Reformas, limpeza, TI, saúde, transporte, eventos e mais. Encontre prestadores na sua região.',
        keywords: ['serviços', 'reformas', 'freelancer', 'manutenção'],
    },
    'Vagas de Emprego': {
        listingTitle: 'Vagas de emprego e oportunidades',
        metaDescription:
            'Oportunidades em administrativo, TI, vendas, saúde e logística. Publique vagas ou encontre seu próximo emprego.',
        keywords: ['vagas', 'emprego', 'trabalho', 'currículo', 'RH'],
    },
};

const DEFAULT_HOME_TITLE = 'Classificados e anúncios grátis no Brasil';
const DEFAULT_HOME_DESCRIPTION =
    'Anúncios de imóveis, veículos, eletrônicos, agro e mais. Filtre por cidade, categoria e preço. Publique grátis no Dezzapego.';
const DEFAULT_HOME_KEYWORDS = [
    'classificados',
    'anúncios grátis',
    'comprar e vender',
    'imóveis',
    'carros usados',
    'Dezzapego',
];

function fallbackCategory(cat: string): CategorySeoBlock {
    return {
        listingTitle: `Anúncios de ${cat}`,
        metaDescription: `Classificados de ${cat} no ${SITE_NAME}. Filtros por localização e preço; publique seu anúncio grátis.`,
        keywords: [cat, 'classificados', 'anúncios', SITE_NAME.toLowerCase()],
    };
}

/** URL canônica da listagem (SPA: pathname não reflete query; sempre use isto para Home). */
export function buildListingCanonicalUrl(parts: {
    category?: string;
    subcategory?: string;
    type?: string;
    q?: string;
}): string {
    const origin = getSiteOrigin();
    const p = new URLSearchParams();
    if (parts.category?.trim()) p.set('category', parts.category.trim());
    if (parts.subcategory?.trim()) p.set('subcategory', parts.subcategory.trim());
    if (parts.type?.trim()) p.set('type', parts.type.trim());
    if (parts.q?.trim()) p.set('q', parts.q.trim());
    const qs = p.toString();
    return qs ? `${origin}/?${qs}` : `${origin}/`;
}

function buildDescriptionWithSub(sub: string, base: CategorySeoBlock): string {
    const short =
        sub.length > 120 ? `${sub.slice(0, 117)}…` : sub;
    return `${short}. ${base.metaDescription}`;
}

export type ListingSeoResult = {
    title: string;
    description: string;
    keywords: string[];
    canonicalUrl: string;
};

/**
 * Meta tags para a Home com filtros por URL (?category=&subcategory=&type=&q=).
 */
export function getListingSeoForHome(params: {
    category: string;
    subcategory: string;
    transactionType: string;
    searchQuery: string;
}): ListingSeoResult {
    const { category, subcategory, transactionType, searchQuery } = params;
    const canonicalUrl = buildListingCanonicalUrl({
        category: category || undefined,
        subcategory: subcategory || undefined,
        type: transactionType || undefined,
        q: searchQuery || undefined,
    });

    if (searchQuery.trim()) {
        const q = searchQuery.trim();
        const title = `Busca: “${q.length > 48 ? `${q.slice(0, 45)}…` : q}”`;
        return {
            title,
            description: `Resultados para “${q}” nos classificados do ${SITE_NAME}. Ajuste categoria e localização para refinar.`,
            keywords: [q, 'busca', 'classificados', SITE_NAME.toLowerCase()],
            canonicalUrl,
        };
    }

    if (!category) {
        return {
            title: DEFAULT_HOME_TITLE,
            description: DEFAULT_HOME_DESCRIPTION,
            keywords: DEFAULT_HOME_KEYWORDS,
            canonicalUrl,
        };
    }

    const block = CATEGORY_SEO[category] ?? fallbackCategory(category);
    let title = block.listingTitle;
    let description = block.metaDescription;
    let keywords = [...block.keywords];

    if (subcategory) {
        title = `${subcategory} — ${category}`;
        description = buildDescriptionWithSub(subcategory, block);
        keywords = [...keywords, ...subcategory.split(/[\s,-]+/).filter((w) => w.length > 2).slice(0, 8)];
    }

    if (transactionType === 'aluguel') {
        title = subcategory ? `${title} (aluguel)` : `${title} — aluguel`;
        description = `Opções de aluguel: ${description}`;
        keywords.push('aluguel');
    } else if (transactionType === 'venda') {
        keywords.push('venda');
    }

    return {
        title,
        description,
        keywords,
        canonicalUrl,
    };
}

export function getDefaultHomeSeoConstants() {
    return {
        title: DEFAULT_HOME_TITLE,
        description: DEFAULT_HOME_DESCRIPTION,
        keywords: DEFAULT_HOME_KEYWORDS,
    };
}

function buildOrganizationGraphNode(): Record<string, unknown> {
    const origin = getSiteOrigin();
    const logoUrl = toAbsoluteUrl(import.meta.env.VITE_ORG_LOGO_URL || '/icon.svg');
    const sameAs = (import.meta.env.VITE_ORG_SAME_AS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const node: Record<string, unknown> = {
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        name: SITE_NAME,
        url: `${origin}/`,
        logo: {
            '@type': 'ImageObject',
            url: logoUrl,
        },
    };
    if (sameAs.length) node.sameAs = sameAs;
    return node;
}

function buildWebSiteGraphNode(): Record<string, unknown> {
    const origin = getSiteOrigin();
    return {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        name: SITE_NAME,
        url: `${origin}/`,
        description: DEFAULT_HOME_DESCRIPTION,
        publisher: { '@id': `${origin}/#organization` },
        potentialAction: {
            '@type': 'SearchAction',
            target: `${origin}/?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
        },
    };
}

/** Organization + WebSite + SearchAction (grafo único — preferido pelo Google). */
export function buildWebsiteStructuredData(): Record<string, unknown> {
    return {
        '@context': 'https://schema.org',
        '@graph': [buildOrganizationGraphNode(), buildWebSiteGraphNode()],
    };
}

/** Listagem por categoria: Organization, WebSite, CollectionPage e BreadcrumbList num único @graph */
export function buildListingStructuredData(params: {
    category: string;
    subcategory?: string;
}): Record<string, unknown> {
    const { category, subcategory } = params;
    const block = CATEGORY_SEO[category] ?? fallbackCategory(category);
    const catUrl = buildListingCanonicalUrl({ category });
    const listUrl = buildListingCanonicalUrl({
        category,
        subcategory: subcategory || undefined,
    });

    const crumbs: { name: string; item: string }[] = [
        { name: 'Início', item: `${origin}/` },
        { name: category, item: catUrl },
    ];
    if (subcategory) {
        crumbs.push({ name: subcategory, item: listUrl });
    }

    const collection: Record<string, unknown> = {
        '@type': 'CollectionPage',
        '@id': `${listUrl}#collection`,
        name: subcategory ? `${subcategory} — ${category}` : block.listingTitle,
        description: block.metaDescription,
        url: listUrl,
        isPartOf: { '@id': `${origin}/#website` },
        publisher: { '@id': `${origin}/#organization` },
    };

    const breadcrumb: Record<string, unknown> = {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: c.name,
            item: c.item,
        })),
    };

    return {
        '@context': 'https://schema.org',
        '@graph': [
            buildOrganizationGraphNode(),
            buildWebSiteGraphNode(),
            collection,
            breadcrumb,
        ],
    };
}

/** Product + Organization + BreadcrumbList para página `/anuncio/:id`. */
export function buildAdDetailStructuredGraph(
    ad: Pick<Ad, 'id' | 'title' | 'description' | 'price' | 'images' | 'category' | 'subcategory' | 'seller'>,
    adPageUrl: string,
    sellerDisplayName: string
): Record<string, unknown> {
    const crumbs: { name: string; item: string }[] = [
        { name: 'Início', item: `${getSiteOrigin()}/` },
        { name: ad.category, item: buildListingCanonicalUrl({ category: ad.category }) },
    ];
    if (ad.subcategory) {
        crumbs.push({
            name: ad.subcategory,
            item: buildListingCanonicalUrl({ category: ad.category, subcategory: ad.subcategory }),
        });
    }
    crumbs.push({ name: ad.title, item: adPageUrl });

    const product: Record<string, unknown> = {
        '@type': 'Product',
        '@id': `${adPageUrl}#product`,
        name: ad.title,
        description: (ad.description ?? '').slice(0, 5000),
        image: ad.images.map((src) => toAbsoluteUrl(src)),
        sku: ad.id,
        category: ad.subcategory ? `${ad.category} › ${ad.subcategory}` : ad.category,
        offers: {
            '@type': 'Offer',
            url: adPageUrl,
            priceCurrency: 'BRL',
            price: ad.price,
            availability: 'https://schema.org/InStock',
            seller: {
                '@type': 'Person',
                name: sellerDisplayName,
            },
        },
    };

    const breadcrumb: Record<string, unknown> = {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: c.name,
            item: c.item,
        })),
    };

    return {
        '@context': 'https://schema.org',
        '@graph': [buildOrganizationGraphNode(), product, breadcrumb],
    };
}

/** Palavras-chave para meta `keywords` em páginas de anúncio (categoria + subcategoria). */
export function getKeywordsForAd(ad: Pick<Ad, 'category' | 'subcategory'>): string[] {
    const block = CATEGORY_SEO[ad.category];
    const base = block ? [...block.keywords] : [ad.category, 'classificados', SITE_NAME.toLowerCase()];
    if (ad.subcategory) {
        const extra = ad.subcategory
            .split(/[\s,/]+/)
            .map((w) => w.trim())
            .filter((w) => w.length > 2)
            .slice(0, 6);
        return [...new Set([...base, ...extra])];
    }
    return base.slice(0, 12);
}

/** Todas as combinações categoria + subcategoria para sitemap interno / ferramentas */
export function getAllCategoryListingPaths(): string[] {
    const paths: string[] = [];
    for (const category of Object.keys(CATEGORIES)) {
        paths.push(`/?category=${encodeURIComponent(category)}`);
        for (const sub of CATEGORIES[category]) {
            paths.push(
                `/?category=${encodeURIComponent(category)}&subcategory=${encodeURIComponent(sub)}`
            );
        }
    }
    return paths;
}
