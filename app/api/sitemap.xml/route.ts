import { createClient } from '@supabase/supabase-js';
import { getAllCategoryListingPaths } from '@/lib/categorySeo';
import { SEO_GUIDES, SEO_LOCATIONS } from '@/lib/seoContent';
import { CATEGORIES } from '@/app/data/categories';
import { slugifyCategoryPart } from '@/lib/categoryRoutes';

const STATIC_PATHS = ['/', '/sobre', '/planos', '/contato', '/termos', '/privacidade', '/dicas-seguranca', '/mapa-do-site'];

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VITE_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://dezzapego.com');
  return raw.replace(/\/+$/, '');
}

type AdSitemapRow = {
  id: string;
  lastmod?: string | null;
};

async function fetchAdsForSitemap(): Promise<AdSitemapRow[]> {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return [];

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return fetchAdsPage('id, status, created_at, updated_at', true).catch(() =>
    fetchAdsPage('id, status', true).catch(() => fetchAdsPage('id', false)),
  );

  async function fetchAdsPage(columns: string, activeOnly: boolean) {
    const rows: AdSitemapRow[] = [];
    const pageSize = 1000;
    let from = 0;

    for (;;) {
      const { data, error } = await supabase
        .from('ads')
        .select(columns)
        .range(from, from + pageSize - 1)
        .throwOnError();
      if (error) throw error;
      if (!data || data.length === 0) break;
      const items = data as unknown as Array<Record<string, unknown>>;
      rows.push(
        ...items
          .filter((item) => !activeOnly || item.status === 'active')
          .map((item) => ({
            id: String(item.id),
            lastmod:
              typeof item.updated_at === 'string'
                ? item.updated_at
                : typeof item.created_at === 'string'
                  ? item.created_at
                  : null,
          })),
      );
      if (data.length < pageSize) break;
      from += pageSize;
    }

    return rows;
  }
}

type SitemapEntry = {
  loc: string;
  lastmod?: string;
};

function buildXml(entries: SitemapEntry[]) {
  const body = entries
    .map((entry) => {
      const lastmod = entry.lastmod ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '';
      return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${lastmod}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export async function GET() {
  const siteUrl = normalizeSiteUrl();
  const entries = new Map<string, SitemapEntry>();
  const nowIso = new Date().toISOString();

  for (const path of STATIC_PATHS) {
    const loc = `${siteUrl}${path}`;
    entries.set(loc, { loc, lastmod: nowIso });
  }
  for (const path of getAllCategoryListingPaths()) {
    const loc = `${siteUrl}${path}`;
    entries.set(loc, { loc, lastmod: nowIso });
  }
  for (const guide of SEO_GUIDES) {
    const loc = `${siteUrl}/guias/${guide.slug}`;
    entries.set(loc, { loc, lastmod: nowIso });
  }
  for (const location of SEO_LOCATIONS) {
    const loc = `${siteUrl}/cidade/${location.stateSlug}/${location.citySlug}`;
    entries.set(loc, { loc, lastmod: nowIso });
    for (const category of Object.keys(CATEGORIES)) {
      const categoryLoc = `${loc}/${slugifyCategoryPart(category)}`;
      entries.set(categoryLoc, { loc: categoryLoc, lastmod: nowIso });
    }
  }

  const ads = await fetchAdsForSitemap();
  for (const ad of ads) {
    const loc = `${siteUrl}/anuncio/${ad.id}`;
    entries.set(loc, { loc, lastmod: ad.lastmod || nowIso });
  }

  const xml = buildXml(Array.from(entries.values()));

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600',
    },
  });
}
