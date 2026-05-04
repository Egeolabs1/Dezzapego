import { createClient } from '@supabase/supabase-js';
import { getAllCategoryListingPaths } from '@/lib/categorySeo';

const STATIC_PATHS = ['/', '/planos', '/contato', '/termos', '/privacidade', '/dicas-seguranca', '/mapa-do-site'];

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeSiteUrl() {
  const raw = process.env.VITE_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://dezzapego.com');
  return raw.replace(/\/+$/, '');
}

type AdSitemapRow = {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
};

async function fetchAdsForSitemap(): Promise<AdSitemapRow[]> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return [];

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rows: AdSitemapRow[] = [];
  const pageSize = 1000;
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('ads')
      .select('id, created_at, updated_at')
      .range(from, from + pageSize - 1);
    if (error) {
      console.error('sitemap ads fetch error:', error);
      break;
    }
    if (!data || data.length === 0) break;
    rows.push(
      ...data.map((item) => ({
        id: String(item.id),
        created_at: item.created_at ?? null,
        updated_at: item.updated_at ?? null,
      })),
    );
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
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

  const ads = await fetchAdsForSitemap();
  for (const ad of ads) {
    const loc = `${siteUrl}/anuncio/${ad.id}`;
    entries.set(loc, { loc, lastmod: ad.updated_at || ad.created_at || nowIso });
  }

  const xml = buildXml(Array.from(entries.values()));

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600',
    },
  });
}
