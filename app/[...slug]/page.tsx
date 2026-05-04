import type { Metadata } from 'next';
import App from '@/app/App';
import { CATEGORIES } from '@/app/data/categories';
import { getCategoryPath, resolveCategoryFromSlug, resolveSubcategoryFromSlug, slugifyCategoryPart } from '@/lib/categoryRoutes';
import {
  buildArticleStructuredData,
  buildLocationStructuredData,
  buildWebPageStructuredData,
  getDefaultHomeSeoConstants,
  getListingSeoForHome,
} from '@/lib/categorySeo';
import { SEO_LOCATIONS, SEO_GUIDES } from '@/lib/seoContent';
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

function baseMetadata(path: string, title: string, description: string, noIndex = false): Metadata {
  const canonical = toAbsoluteUrl(path);
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
          url: toAbsoluteUrl('/og-default.png'),
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
      images: [toAbsoluteUrl('/og-default.png')],
    },
  };
}

function metadataForPath(path: string): Metadata {
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
      'Sobre o Dezzapego',
      'Conheça o Dezzapego, uma plataforma brasileira de classificados para comprar, vender e desapegar com segurança.',
    );
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
        ? `${category} em ${location.city}, ${location.state}`
        : `Anúncios em ${location.city}, ${location.state}`;
      const description = category
        ? `Encontre anúncios de ${category} em ${location.city}, ${location.state}. Veja ofertas locais e publique grátis no Dezzapego.`
        : `Compre e venda em ${location.city}, ${location.state}. Veja anúncios locais no Dezzapego por categoria, preço e localização.`;
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
  ];
  const noIndex = noIndexPaths.some((item) => path === item || path.startsWith('/admin'));
  const noIndexMetadata: Record<string, { title: string; description: string }> = {
    '/login': {
      title: 'Entrar',
      description: 'Acesse sua conta no Dezzapego para anunciar, responder interessados e gerenciar seus anúncios.',
    },
    '/register': {
      title: 'Criar Conta',
      description: 'Crie sua conta no Dezzapego para comprar, vender e publicar anúncios com segurança.',
    },
    '/redefinir-senha': {
      title: 'Redefinir Senha',
      description: 'Recupere o acesso à sua conta Dezzapego com segurança.',
    },
    '/anunciar': {
      title: 'Anunciar Grátis',
      description: 'Publique seu anúncio grátis no Dezzapego.',
    },
  };
  if (noIndexMetadata[path]) {
    return baseMetadata(path, noIndexMetadata[path].title, noIndexMetadata[path].description, true);
  }
  return baseMetadata(path, homeSeo.title, homeSeo.description, noIndex);
}

function JsonLdForPath({ path }: { path: string }) {
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
      data.push(
        buildWebPageStructuredData({
          title: seo.title,
          description: seo.description,
          path,
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
        ? `${category} em ${location.city}, ${location.state}`
        : `Anúncios em ${location.city}, ${location.state}`;
      const description = category
        ? `Encontre anúncios de ${category} em ${location.city}, ${location.state}. Veja ofertas locais e publique grátis no Dezzapego.`
        : `Compre e venda em ${location.city}, ${location.state}. Veja anúncios locais no Dezzapego por categoria, preço e localização.`;
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
    data.push(buildWebPageStructuredData({
      title: 'Classificados e anúncios grátis no Brasil',
      description:
        'Anúncios de imóveis, veículos, eletrônicos, agro e mais. Filtre por cidade, categoria e preço. Publique grátis no Dezzapego.',
      path,
    }));
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
  return metadataForPath(toPath(resolvedParams.slug));
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

  return (
    <>
      <JsonLdForPath path={path} />
      <App initialPath={path} enableHelmet={false} />
    </>
  );
}
