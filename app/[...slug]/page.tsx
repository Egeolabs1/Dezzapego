import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import App from '@/app/App';
import { CATEGORIES } from '@/app/data/categories';
import { getCategoryPath, resolveCategoryFromSlug, resolveSubcategoryFromSlug, slugifyCategoryPart } from '@/lib/categoryRoutes';
import {
  buildArticleStructuredData,
  buildFaqStructuredData,
  buildListingStructuredData,
  buildLocalBusinessStructuredData,
  buildLocationStructuredData,
  buildWebPageStructuredData,
  getDefaultHomeSeoConstants,
  getListingSeoForHome,
} from '@/lib/categorySeo';
import { SEO_LOCATIONS, SEO_GUIDES, SAFETY_FAQS, PLANS_FAQS, ABOUT_FAQS } from '@/lib/seoContent';
import { fetchBusinessForSeo, fetchProfileForSeo } from '@/lib/serverBusinessSeo';
import { SITE_NAME, toAbsoluteUrl } from '@/lib/seo';

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

function toPath(slug?: string[]) {
  return `/${(slug || []).join('/')}`.replace(/\/$/, '') || '/';
}

function titleWithSite(title: string) {
  return `${title} | ${SITE_NAME}`;
}

function baseMetadata(
  path: string,
  title: string,
  description: string,
  noIndex = false,
  customImage?: string,
): Metadata {
  const canonical = toAbsoluteUrl(path);
  const image = customImage ? toAbsoluteUrl(customImage) : toAbsoluteUrl('/og-default.png');
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        'pt-BR': canonical,
        'x-default': canonical,
      },
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
    openGraph: {
      locale: 'pt_BR',
      siteName: SITE_NAME,
      type: 'website',
      title: titleWithSite(title),
      description,
      url: canonical,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: titleWithSite(title),
      description,
      images: [image],
    },
  };
}

async function metadataForPath(path: string): Promise<Metadata> {
  const homeSeo = getDefaultHomeSeoConstants();
  if (path === '/') {
    return baseMetadata('/', homeSeo.title, homeSeo.description);
  }

  const guide = SEO_GUIDES.find((item) => `/guias/${item.slug}` === path);
  if (guide) {
    return {
      ...baseMetadata(path, guide.title, guide.description),
      openGraph: {
        ...baseMetadata(path, guide.title, guide.description).openGraph,
        type: 'article',
      },
    };
  }

  if (path === '/sobre') {
    return baseMetadata(
      path,
      'Sobre o Dezzapego — Quem Somos e Nossa Missão',
      'Conheça o Dezzapego: a plataforma brasileira de classificados criada para facilitar a compra, venda e desapego de produtos e serviços com total segurança.',
    );
  }

  if (path === '/planos') {
    return baseMetadata(
      path,
      'Planos e Destaques para Anunciantes',
      'Turbine suas vendas no Dezzapego. Conheça nossos planos profissionais para imobiliárias, concessionárias e lojistas com maior visibilidade.',
    );
  }

  if (path === '/dicas-seguranca') {
    return baseMetadata(
      path,
      'Dicas de Segurança para Comprar e Vender Online',
      'Aprenda as melhores práticas para negociar com segurança na internet, evitar fraudes e fechar negócios confiáveis no Dezzapego.',
    );
  }

  if (path === '/contato') {
    return baseMetadata(
      path,
      'Fale Conosco — Atendimento e Suporte',
      'Entre em contato com a equipe do Dezzapego. Tire dúvidas sobre seus anúncios, planos ou envie sugestões para nossa plataforma.',
    );
  }

  if (path === '/termos') {
    return baseMetadata(
      path,
      'Termos de Uso',
      'Confira os Termos e Condições de Uso da plataforma Dezzapego para compradores e anunciantes em todo o Brasil.',
    );
  }

  if (path === '/privacidade') {
    return baseMetadata(
      path,
      'Política de Privacidade e Proteção de Dados',
      'Saiba como o Dezzapego protege seus dados pessoais e cumpre integralmente as diretrizes da LGPD com total transparência.',
    );
  }

  if (path === '/mapa-do-site') {
    return baseMetadata(
      path,
      'Mapa do Site — Categorias, Cidades e Guias',
      'Navegue pelo mapa completo do Dezzapego: acesse anúncios em todas as cidades brasileiras, categorias e guias de compra e venda.',
    );
  }

  // Business profile routes: /empresa/:slug, /loja/:slug, /imobiliaria/:slug, /corretor/:slug
  const businessMatch = path.match(/^\/(?:empresa|loja|imobiliaria|corretor)\/([^/]+)$/);
  if (businessMatch) {
    const slug = businessMatch[1];
    const business = await fetchBusinessForSeo(slug);
    if (business) {
      const typeLabel =
        business.type === 'real_estate'
          ? 'Imobiliária'
          : business.type === 'vehicle_dealer'
          ? 'Concessionária'
          : 'Loja';
      const locLabel = business.city && business.state ? ` em ${business.city}, ${business.state}` : '';
      const title = `${business.name} — ${typeLabel}${locLabel}`;
      const description =
        business.description?.slice(0, 160) ||
        `Confira os anúncios e ofertas de ${business.name}${locLabel} no Dezzapego. Compre com segurança e fale direto pelo WhatsApp.`;
      const image = business.logo_url || business.cover_url || undefined;
      return baseMetadata(path, title, description, false, image);
    }
    return baseMetadata(path, 'Empresa não encontrada', 'Esta empresa não existe ou foi desativada.', true);
  }

  // Seller profile route: /anunciante/:id
  const sellerMatch = path.match(/^\/anunciante\/([^/]+)$/);
  if (sellerMatch) {
    const profile = await fetchProfileForSeo(sellerMatch[1]);
    if (profile) {
      const name = profile.full_name || 'Vendedor';
      const loc = profile.city && profile.state ? ` em ${profile.city}, ${profile.state}` : '';
      const title = `Anúncios de ${name}${loc}`;
      const description = `Veja todos os anúncios ativos publicados por ${name}${loc} no Dezzapego.`;
      return baseMetadata(path, title, description, false, profile.avatar_url || undefined);
    }
    return baseMetadata(path, 'Anunciante', 'Perfil de anunciante no Dezzapego.', true);
  }

  const categoryMatch = path.match(/^\/categoria\/([^/]+)(?:\/([^/]+))?$/);
  if (categoryMatch) {
    const category = resolveCategoryFromSlug(categoryMatch[1]);
    const subcategory = resolveSubcategoryFromSlug(category, categoryMatch[2]);
    if (category) {
      const seo = getListingSeoForHome({
        category,
        subcategory,
        transactionType: '',
        searchQuery: '',
      });
      return baseMetadata(path, seo.title, seo.description);
    }
  }

  const locationMatch = path.match(/^\/cidade\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/);
  if (locationMatch) {
    const location = SEO_LOCATIONS.find(
      (item) => item.stateSlug === locationMatch[1] && item.citySlug === locationMatch[2],
    );
    const category = resolveCategoryFromSlug(locationMatch[3]);
    if (location) {
      const title = category
        ? `${category} em ${location.city}, ${location.state} — Comprar e Vender`
        : `Classificados em ${location.city}, ${location.state} — Anúncios Grátis`;
      const description = category
        ? `Encontre anúncios de ${category} em ${location.city}, ${location.state}. Veja ofertas com fotos e preços e publique grátis no Dezzapego.`
        : `Compre e venda em ${location.city}, ${location.state}. Veja anúncios locais no Dezzapego de imóveis, carros, celulares, móveis e serviços.`;
      return baseMetadata(path, title, description);
    }
  }

  const noIndexPaths = [
    '/login',
    '/register',
    '/redefinir-senha',
    '/anunciar',
    '/meus-anuncios',
    '/dashboard',
    '/favoritos',
    '/conta-suspensa',
  ];
  const noIndex = noIndexPaths.some((item) => path === item || path.startsWith('/admin') || path.startsWith('/checkout'));
  const noIndexMetadata: Record<string, { title: string; description: string }> = {
    '/login': {
      title: 'Entrar na Conta',
      description: 'Acesse sua conta no Dezzapego para anunciar, responder interessados e gerenciar seus anúncios.',
    },
    '/register': {
      title: 'Criar Conta Grátis',
      description: 'Crie sua conta no Dezzapego para comprar, vender e publicar anúncios com segurança.',
    },
    '/redefinir-senha': {
      title: 'Redefinir Senha',
      description: 'Recupere o acesso à sua conta Dezzapego com segurança.',
    },
    '/anunciar': {
      title: 'Anunciar Grátis',
      description: 'Publique seu anúncio grátis no Dezzapego em poucos minutos.',
    },
    '/meus-anuncios': {
      title: 'Meus Anúncios',
      description: 'Gerencie seus anúncios publicados no Dezzapego.',
    },
    '/dashboard': {
      title: 'Painel do Usuário',
      description: 'Painel de controle do usuário no Dezzapego.',
    },
    '/favoritos': {
      title: 'Meus Favoritos',
      description: 'Veja os anúncios salvos nos seus favoritos no Dezzapego.',
    },
    '/conta-suspensa': {
      title: 'Conta Suspensa',
      description: 'Informações sobre suspensão de conta no Dezzapego.',
    },
  };
  if (noIndexMetadata[path]) {
    return baseMetadata(path, noIndexMetadata[path].title, noIndexMetadata[path].description, true);
  }

  // SEO location pages: /{uf}/{city}/{category}/{brand}/{model}
  const ufLocationMatch = path.match(/^\/([a-z]{2})(?:\/([^/]+))?(?:\/([^/]+))?(?:\/([^/]+))?(?:\/([^/]+))?$/);
  if (ufLocationMatch) {
    try {
      const { fetchSeoLocationPage } = await import('@/lib/seoLocationSeo');
      const pageData = await fetchSeoLocationPage(path);

      if (!pageData || !pageData.is_active) {
        return baseMetadata(path, 'Página não encontrada', 'Esta página não existe no Dezzapego.', true);
      }

      const hasContent = pageData.intro_text || pageData.h1;
      if (!hasContent) {
        return baseMetadata(path, pageData.title || 'Página', pageData.description || '', true);
      }

      return baseMetadata(path, pageData.title, pageData.description);
    } catch {
      return baseMetadata(path, 'Dezzapego', 'Classificados e anúncios no Dezzapego.');
    }
  }

  return baseMetadata(path, homeSeo.title, homeSeo.description, noIndex);
}

function isKnownSeoPath(path: string) {
  if (path === '/') return true;

  if ([
    '/sobre',
    '/planos',
    '/contato',
    '/termos',
    '/privacidade',
    '/dicas-seguranca',
    '/mapa-do-site',
    '/login',
    '/redefinir-senha',
    '/register',
    '/anunciar',
    '/meus-anuncios',
    '/dashboard',
    '/favoritos',
    '/conta-suspensa',
  ].includes(path)) {
    return true;
  }

  if (/^\/admin(?:\/.*)?$/.test(path)) {
    return true;
  }

  if (/^\/anunciante\/[^/]+$/.test(path)) {
    return true;
  }

  if (/^\/anuncio\/[^/]+$/.test(path)) {
    return true;
  }

  if (/^\/checkout(?:\/.*)?$/.test(path)) {
    return true;
  }

  if (/^\/editar(?:-anuncio)?\/[^/]+$/.test(path)) {
    return true;
  }

  if (/^\/empresa\/[^/]+$/.test(path)) {
    return true;
  }

  if (/^\/business(?:\/.*)?$/.test(path)) {
    return true;
  }

  if (/^\/imobiliaria\/[^/]+$/.test(path)) {
    return true;
  }

  if (/^\/corretor\/[^/]+$/.test(path)) {
    return true;
  }

  if (/^\/loja\/[^/]+$/.test(path)) {
    return true;
  }

  if (SEO_GUIDES.some((item) => `/guias/${item.slug}` === path)) {
    return true;
  }

  const categoryMatch = path.match(/^\/categoria\/([^/]+)(?:\/([^/]+))?$/);
  if (categoryMatch) {
    const category = resolveCategoryFromSlug(categoryMatch[1]);
    if (!category) return false;
    if (!categoryMatch[2]) return true;
    return Boolean(resolveSubcategoryFromSlug(category, categoryMatch[2]));
  }

  const locationMatch = path.match(/^\/cidade\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/);
  if (locationMatch) {
    const location = SEO_LOCATIONS.find(
      (item) => item.stateSlug === locationMatch[1] && item.citySlug === locationMatch[2],
    );
    if (!location) return false;
    if (!locationMatch[3]) return true;
    return Boolean(resolveCategoryFromSlug(locationMatch[3]));
  }

  // SEO location pages: /{uf}/{city}/{category}/{brand}/{model}
  if (/^\/[a-z]{2}(?:\/[^/]+)*(?:\/[^/]+)*$/.test(path)) {
    return true;
  }

  return false;
}

async function JsonLdForPath({ path }: { path: string }) {
  const data: Record<string, unknown>[] = [];
  const guide = SEO_GUIDES.find((item) => `/guias/${item.slug}` === path);
  if (guide) {
    data.push(
      buildArticleStructuredData({
        title: guide.title,
        description: guide.description,
        path,
      }),
    );
  }

  if (path === '/dicas-seguranca') {
    data.push(
      buildFaqStructuredData({
        title: 'Dicas de Segurança para Comprar e Vender Online',
        description: 'Perguntas frequentes e boas práticas para negociar com segurança no Dezzapego.',
        path,
        faqs: SAFETY_FAQS,
      }),
    );
  }

  if (path === '/planos') {
    data.push(
      buildFaqStructuredData({
        title: 'Planos e Destaques do Dezzapego',
        description: 'Tire suas dúvidas sobre os planos profissionais e benefícios para lojistas no Dezzapego.',
        path,
        faqs: PLANS_FAQS,
      }),
    );
  }

  if (path === '/sobre') {
    data.push(
      buildFaqStructuredData({
        title: 'Sobre o Dezzapego',
        description: 'Conheça o Dezzapego e tire dúvidas sobre a plataforma de classificados.',
        path,
        faqs: ABOUT_FAQS,
      }),
    );
  }

  // Business profile structured data
  const businessMatch = path.match(/^\/(?:empresa|loja|imobiliaria|corretor)\/([^/]+)$/);
  if (businessMatch) {
    const business = await fetchBusinessForSeo(businessMatch[1]);
    if (business) {
      const schemaType =
        business.type === 'real_estate'
          ? 'RealEstateAgent'
          : business.type === 'vehicle_dealer'
          ? 'AutoDealer'
          : 'LocalBusiness';
      data.push(
        buildLocalBusinessStructuredData({
          name: business.name,
          description: business.description || `Empresa ${business.name} no Dezzapego`,
          path,
          image: business.cover_url || undefined,
          logo: business.logo_url || undefined,
          telephone: business.phone || business.whatsapp || undefined,
          address: {
            addressLocality: business.city || undefined,
            addressRegion: business.state || undefined,
          },
          businessType: schemaType,
        }),
      );
    }
  }

  const categoryMatch = path.match(/^\/categoria\/([^/]+)(?:\/([^/]+))?$/);
  if (categoryMatch) {
    const category = resolveCategoryFromSlug(categoryMatch[1]);
    const subcategory = resolveSubcategoryFromSlug(category, categoryMatch[2]);
    if (category) {
      data.push(
        buildListingStructuredData({
          category,
          subcategory: subcategory || undefined,
        }),
      );
    }
  }

  const locationMatch = path.match(/^\/cidade\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/);
  if (locationMatch) {
    const location = SEO_LOCATIONS.find(
      (item) => item.stateSlug === locationMatch[1] && item.citySlug === locationMatch[2],
    );
    const category = resolveCategoryFromSlug(locationMatch[3]);
    if (location) {
      const title = category
        ? `${category} em ${location.city}, ${location.state} — Comprar e Vender`
        : `Classificados em ${location.city}, ${location.state} — Anúncios Grátis`;
      const description = category
        ? `Encontre anúncios de ${category} em ${location.city}, ${location.state}. Veja ofertas com fotos e preços e publique grátis no Dezzapego.`
        : `Compre e venda em ${location.city}, ${location.state}. Veja anúncios locais no Dezzapego de imóveis, carros, celulares, móveis e serviços.`;
      data.push(
        buildLocationStructuredData({
          title,
          description,
          path,
          city: location.city,
          state: location.state,
        }),
      );
    }
  }

  if (path === '/' || data.length === 0) {
    data.push(
      buildWebPageStructuredData({
        title: 'Dezzapego | Compre e Venda Grátis no Brasil — Imóveis, Carros e Mais',
        description:
          'Compre e venda de tudo no Dezzapego: imóveis, carros, eletrônicos, móveis, agro e serviços. Encontre ofertas perto de você ou publique seu anúncio 100% grátis.',
        path,
      }),
    );
  }

  return (
    <>
      {data.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  return await metadataForPath(toPath(resolvedParams.slug));
}

export function generateStaticParams() {
  const paths: string[][] = [
    ['sobre'],
    ['planos'],
    ['contato'],
    ['termos'],
    ['privacidade'],
    ['dicas-seguranca'],
    ['mapa-do-site'],
  ];

  SEO_GUIDES.forEach((guide) => paths.push(['guias', guide.slug]));
  Object.entries(CATEGORIES).forEach(([category, subcategories]) => {
    const categoryPath = getCategoryPath(category).replace(/^\//, '').split('/');
    paths.push(categoryPath);
    subcategories.forEach((subcategory) => {
      paths.push(getCategoryPath(category, subcategory).replace(/^\//, '').split('/'));
    });
  });
  SEO_LOCATIONS.forEach((location) => {
    paths.push(['cidade', location.stateSlug, location.citySlug]);
    Object.keys(CATEGORIES).forEach((category) => {
      paths.push(['cidade', location.stateSlug, location.citySlug, slugifyCategoryPart(category)]);
    });
  });

  return paths.map((slug) => ({ slug }));
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  const path = toPath(resolvedParams.slug);
  if (!isKnownSeoPath(path)) {
    notFound();
  }

  return (
    <>
      <Suspense fallback={null}>
        <JsonLdForPath path={path} />
      </Suspense>
      <Suspense>
        <App initialPath={path} enableHelmet={false} />
      </Suspense>
    </>
  );
}
