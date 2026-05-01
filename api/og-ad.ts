import { createClient } from '@supabase/supabase-js';

type AdPreview = {
  id: string;
  title: string | null;
  images: string[] | null;
};

function getSiteUrl() {
  const raw = process.env.VITE_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://dezzapego.com');
  return raw.replace(/\/+$/, '');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toAbsolute(siteUrl: string, maybeUrl: string) {
  if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;
  return maybeUrl.startsWith('/') ? `${siteUrl}${maybeUrl}` : `${siteUrl}/${maybeUrl}`;
}

function buildHtml(args: {
  siteUrl: string;
  canonicalUrl: string;
  description: string;
  imageUrl: string;
}) {
  const title = 'Dezzapego';
  const escapedDescription = escapeHtml(args.description);
  const escapedImage = escapeHtml(args.imageUrl);
  const escapedCanonical = escapeHtml(args.canonicalUrl);
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${escapedDescription}" />
  <link rel="canonical" href="${escapedCanonical}" />
  <meta property="og:locale" content="pt_BR" />
  <meta property="og:site_name" content="Dezzapego" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${escapedDescription}" />
  <meta property="og:url" content="${escapedCanonical}" />
  <meta property="og:image" content="${escapedImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${escapedDescription}" />
  <meta name="twitter:image" content="${escapedImage}" />
  <meta http-equiv="refresh" content="0; url=${escapedCanonical}" />
</head>
<body>
  <script>window.location.replace(${JSON.stringify(args.canonicalUrl)});</script>
  <a href="${escapedCanonical}">Ir para o anúncio</a>
</body>
</html>`;
}

async function fetchAd(siteUrl: string, id: string): Promise<AdPreview | null> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) return null;

  const supabase = createClient(supabaseUrl, supabaseAnon, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'x-client-info': 'og-ad-preview' } },
  });

  const { data, error } = await supabase
    .from('ads')
    .select('id, title, images')
    .eq('id', id)
    .maybeSingle<AdPreview>();

  if (error || !data) {
    console.warn('og-ad fetch failed:', error?.message || 'not found');
    return null;
  }

  return data;
}

export default async function handler(req: Request) {
  const siteUrl = getSiteUrl();
  const url = new URL(req.url);
  const adId = (url.searchParams.get('id') || '').trim();
  const canonicalUrl = adId ? `${siteUrl}/anuncio/${adId}` : `${siteUrl}/`;
  const fallbackImage = `${siteUrl}/og-default.png`;

  let description = 'Imóveis, carros, eletrônicos e mais. Publique anúncios grátis no Dezzapego.';
  let imageUrl = fallbackImage;

  if (adId) {
    const ad = await fetchAd(siteUrl, adId);
    if (ad?.title?.trim()) {
      description = ad.title.trim();
    }
    if (ad?.images?.[0]) {
      imageUrl = toAbsolute(siteUrl, ad.images[0]);
    }
  }

  const html = buildHtml({
    siteUrl,
    canonicalUrl,
    description,
    imageUrl,
  });

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, s-maxage=600, stale-while-revalidate=86400',
    },
  });
}
