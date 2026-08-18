'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Search,
  Building2,
  ImageOff,
} from 'lucide-react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/formatters';
import { getSeoLocationPage } from '../../lib/seoLocations';
import { generateBreadcrumbStructuredData, generateStructuredData } from '../../lib/seoLocations';
import type { SeoLocationPage as SeoLocationPageType } from '../../types';

// ── Mapeamento slug_type → label de categoria usada na tabela ads ─
const CATEGORY_LABELS: Record<string, string> = {
  carros: 'Autos e Peças',
  imoveis: 'Imóveis',
  imobiliarias: 'Imóveis',
  'lojas-de-carros': 'Autos e Peças',
  celulares: 'Eletrônicos e Celulares',
  eletronicos: 'Eletrônicos e Celulares',
  moveis: 'Para a sua Casa',
  roupas: 'Moda e Beleza',
  outros: 'Outros',
};

type AdRow = {
  id: string;
  title: string;
  price: number;
  category: string;
  images: string[];
  description?: string;
  status?: string;
  created_at?: string;
  cidade?: string | null;
  estado?: string | null;
  location?: { city?: string; state?: string } | null;
  [key: string]: unknown;
};

// ── Mapa de slugs de UF para nome por extenso ─
const UF_NAMES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas',
  BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão',
  MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco',
  PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima',
  SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

// ── Converte slug de UF para sigla ─
function ufSlugToCode(slug: string): string {
  const upper = slug.toUpperCase();
  if (UF_NAMES[upper]) return upper;
  // Fallback: tenta encontrar pelo nome em minusculas
  const entry = Object.entries(UF_NAMES).find(
    ([, name]) => name.toLowerCase().replace(/\s+/g, '-') === slug.toLowerCase(),
  );
  return entry ? entry[0] : upper;
}

// ── Converte slug de cidade para titulo ─
function citySlugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Props ────────────────────────────────────────────────────────
interface Props {
  path: string;
}

// ══════════════════════════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════════════════════════

export default function SeoLocationPage({ path }: Props) {
  const [pageData, setPageData] = useState<SeoLocationPageType | null>(null);
  const [ads, setAds] = useState<AdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adsError, setAdsError] = useState<string | null>(null);

  // ── Carrega dados da pagina SEO ────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const ADS_TIMEOUT_MS = 10_000;

    async function load() {
      setLoading(true);
      setAdsError(null);
      try {
        const data = await getSeoLocationPage(path);
        if (cancelled) return;

        if (!data || !data.is_active) {
          setPageData(null);
          return;
        }

        setPageData(data);

        // Definir titulo e descricao da pagina
        document.title = data.title ? `${data.title} | Dezzapego` : 'Dezzapego';
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && data.description) {
          metaDesc.setAttribute('content', data.description);
        }

        // ── Carregar anuncios filtrados ──────────────────────────
        const categoryLabel = CATEGORY_LABELS[data.slug_type];

        let query = supabase
          .from('ads')
          .select('*')
          .eq('status', 'active')
          .eq('estado', data.estado)
          .order('created_at', { ascending: false })
          .limit(30);

        // Filtrar por cidade se disponivel
        if (data.cidade) {
          query = query.eq('cidade', data.cidade);
        }

        // Filtrar por categoria se disponivel
        if (categoryLabel) {
          query = query.eq('category', categoryLabel);
        }

        const { data: adsData, error } = await Promise.race([
          query,
          new Promise<{ data: null; error: { message: string } }>((resolve) =>
            setTimeout(() => resolve({ data: null, error: { message: 'Timeout ao buscar anuncios' } }), ADS_TIMEOUT_MS),
          ),
        ]);

        if (cancelled) return;

        if (error) {
          console.error('Erro ao buscar anuncios SEO:', error);
          setAdsError('Erro ao carregar anuncios.');
        } else {
          setAds(adsData ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Erro ao carregar pagina SEO:', err);
          setPageData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [path]);

  // ── Skeleton de carregamento ───────────────────────────────────
  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Breadcrumbs skeleton */}
          <div className="h-4 bg-gray-200 rounded w-64 mb-6 animate-pulse" />
          {/* H1 skeleton */}
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4 animate-pulse" />
          {/* Intro skeleton */}
          <div className="space-y-2 mb-8">
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
          </div>
          {/* Cards skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Pagina nao encontrada ──────────────────────────────────────
  if (!pageData) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-16 text-center max-w-lg">
          <div className="w-20 h-20 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">
            Pagina nao encontrada
          </h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            A pagina que voce procura nao existe ou foi desativada.
            Tente buscar por anuncios na pagina inicial ou navegue pelas categorias.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-700 shadow-purple-200 shadow-md transition-colors text-center"
            >
              Pagina Inicial
            </Link>
            <Link
              href="/"
              className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors text-center"
            >
              Ver Anuncios
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Dados derivados ────────────────────────────────────────────
  const ufCode = ufSlugToCode(pageData.estado);
  const ufName = UF_NAMES[ufCode] || ufCode;
  const cityName = pageData.cidade || citySlugToTitle(pageData.cidade ?? '');

  // Gerar breadcrumbs a partir do path
  const segments = path.split('/').filter(Boolean);
  const breadcrumbItems: { label: string; href?: string }[] = [];
  let accumPath = '';

  for (const segment of segments) {
    accumPath += `/${segment}`;
    // Ultimo segmento = pagina atual (sem link)
    const isLast = accumPath === `/${path}`;
    breadcrumbItems.push({
      label:
        segment === ufCode.toLowerCase() || segment === pageData.estado.toLowerCase()
          ? ufName
          : citySlugToTitle(segment),
      ...(isLast ? {} : { href: accumPath }),
    });
  }

  // ── Structured data ────────────────────────────────────────────
  const structuredData = [
    generateBreadcrumbStructuredData(
      breadcrumbItems.map((item) => ({
        name: item.label,
        url: `https://dezzapego.com.br${item.href || `/${path}`}`,
      })),
    ),
    generateStructuredData('Organization', {
      name: 'Dezzapego',
      url: 'https://dezzapego.com.br',
      logo: 'https://dezzapego.com.br/logo.png',
      sameAs: [
        'https://www.instagram.com/dezzapego',
        'https://www.facebook.com/dezzapego',
      ],
    }),
    generateStructuredData('WebPage', {
      name: pageData.h1 || pageData.title,
      description: pageData.description,
      url: `https://dezzapego.com.br/${path}`,
      isPartOf: {
        '@type': 'WebSite',
        name: 'Dezzapego',
        url: 'https://dezzapego.com.br',
      },
    }),
  ];

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      {/* ── Structured Data (JSON-LD) ─────────────────────────── */}
      {structuredData.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* ── Breadcrumbs ──────────────────────────────────────── */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* ── Cabecalho ────────────────────────────────────────── */}
        <div className="mt-6 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            {pageData.h1 || pageData.title}
          </h1>

          {/* Texto introductorio */}
          {pageData.intro_text && (
            <p className="text-gray-600 leading-relaxed max-w-3xl">
              {pageData.intro_text}
            </p>
          )}

          {/* Info de localizacao */}
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-sm text-gray-500 bg-white px-3 py-1.5 rounded-full border border-gray-100">
              <MapPin className="w-4 h-4 text-purple-500" />
              {pageData.cidade
                ? `${cityName}, ${ufName}`
                : ufName}
            </span>
            <span className="text-sm text-gray-400">
              {ads.length} {ads.length === 1 ? 'anuncio' : 'anuncios'}
            </span>
          </div>
        </div>

        {/* ── Lista de Anuncios ────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-600" />
            Anuncios em{' '}
            {pageData.cidade
              ? `${cityName}, ${ufName}`
              : ufName}
            {CATEGORY_LABELS[pageData.slug_type] && (
              <span className="text-sm font-normal text-gray-400">
                — {CATEGORY_LABELS[pageData.slug_type]}
              </span>
            )}
          </h2>

          {adsError && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
              <p className="text-sm text-red-600">{adsError}</p>
            </div>
          )}

          {!adsError && ads.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">
                Nenhum anuncio encontrado nesta regiao.
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Seja o primeiro a publicar um anuncio aqui!
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-700 shadow-purple-200 shadow-md transition-colors"
              >
                Explorar Anuncios
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {ads.map(ad => (
                <AdCard key={ad.id} ad={ad} />
              ))}
            </div>
          )}
        </section>

        {/* ── Links relacionados (localizacao) ─────────────────── */}
        {breadcrumbItems.length >= 2 && (
          <div className="mt-10 pt-8 border-t border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              Mais sobre {ufName}
            </h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(CATEGORY_LABELS)
                .filter(([, label]) => label !== CATEGORY_LABELS[pageData.slug_type])
                .slice(0, 6)
                .map(([slug, label]) => (
                  <Link
                    key={slug}
                    href={`/${pageData.estado.toLowerCase()}/${breadcrumbItems[1]?.href?.split('/')[2] || pageData.cidade?.toLowerCase().replace(/\s+/g, '-') || ''}/${slug}`}
                    className="text-sm font-medium px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600 transition-colors"
                  >
                    {label}
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Ad Card
// ══════════════════════════════════════════════════════════════════

function AdCard({ ad }: { ad: AdRow }) {
  const [imgError, setImgError] = useState(false);
  const firstImage = ad.images?.[0];

  return (
    <Link
      href={`/anuncio/${ad.id}`}
      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
    >
      <div className="relative aspect-[4/3] bg-gray-100">
        {firstImage && !imgError ? (
          <img
            src={firstImage}
            alt={ad.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-gray-300" />
          </div>
        )}
        {ad.category && (
          <span className="absolute top-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-600 text-white shadow-sm">
            {ad.category}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-base font-bold text-purple-600">
          {formatPrice(ad.price)}
        </p>
        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mt-1 group-hover:text-purple-600 transition-colors">
          {ad.title}
        </h3>
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {ad.cidade || ad.location?.city || ''}, {ad.estado || ad.location?.state || ''}
          </span>
        </div>
      </div>
    </Link>
  );
}
