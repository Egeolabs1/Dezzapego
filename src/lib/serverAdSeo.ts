import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import { buildAdDetailStructuredGraph, getKeywordsForAd } from './categorySeo';
import { getDefaultShareImagePath, SITE_NAME, toAbsoluteUrl } from './seo';
import type { Ad } from '../types';

type AdSeoRow = {
  id: string;
  user_id?: string | null;
  title?: string | null;
  price?: number | string | null;
  description?: string | null;
  category?: string | null;
  subcategory?: string | null;
  location?: unknown;
  images?: unknown;
  seller?: unknown;
  created_at?: string | null;
  updated_at?: string | null;
  publishedAt?: string | null;
  status?: string | null;
};

let _serverSupabase: ReturnType<typeof createClient> | null = null;

function getServerSupabase() {
  if (_serverSupabase) return _serverSupabase;

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) return null;

  _serverSupabase = createClient(supabaseUrl, supabaseAnon, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'x-client-info': 'ad-seo-server' } },
  });
  return _serverSupabase;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function normalizeLocation(value: unknown): Ad['location'] {
  if (value && typeof value === 'object') {
    const raw = value as Record<string, unknown>;
    return {
      city: typeof raw.city === 'string' ? raw.city : '',
      state: typeof raw.state === 'string' ? raw.state : '',
      neighborhood: typeof raw.neighborhood === 'string' ? raw.neighborhood : undefined,
    };
  }
  return { city: '', state: '' };
}

function normalizeSeller(value: unknown): Ad['seller'] {
  if (value && typeof value === 'object') {
    const raw = value as Record<string, unknown>;
    return {
      name: typeof raw.name === 'string' ? raw.name : 'Vendedor Dezzapego',
      avatar_url: typeof raw.avatar_url === 'string' ? raw.avatar_url : null,
      memberSince: typeof raw.memberSince === 'string' ? raw.memberSince : '',
      type: raw.type === 'professional' ? 'professional' : raw.type === 'personal' ? 'personal' : undefined,
      verified: typeof raw.verified === 'boolean' ? raw.verified : undefined,
    };
  }
  return { name: 'Vendedor Dezzapego', memberSince: '' };
}

function normalizeAd(row: AdSeoRow): Ad {
  const publishedAt = row.publishedAt || row.created_at || row.updated_at || new Date(0).toISOString();
  return {
    id: String(row.id),
    user_id: row.user_id || '',
    title: row.title?.trim() || 'Anúncio no Dezzapego',
    price: Number(row.price || 0),
    description: row.description?.trim() || 'Anúncio publicado no Dezzapego.',
    category: row.category?.trim() || 'Classificados',
    subcategory: row.subcategory?.trim() || '',
    location: normalizeLocation(row.location),
    images: asStringArray(row.images),
    seller: normalizeSeller(row.seller),
    publishedAt,
    featured: false,
    views: 0,
  };
}

export async function fetchAdForSeo(id: string): Promise<Ad | null> {
  const supabase = getServerSupabase();
  if (!supabase || !id) return null;

  const baseColumns = 'id, user_id, title, price, description, category, subcategory, location, images, seller, status';
  const { data, error } = await supabase
    .from('ads')
    .select(`${baseColumns}, created_at, updated_at`)
    .eq('id', id)
    .maybeSingle<AdSeoRow>();

  if (data) {
    if (data.status && data.status !== 'active') return null;
    return normalizeAd(data);
  }

  if (error) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('ads')
      .select(baseColumns)
      .eq('id', id)
      .maybeSingle<AdSeoRow>();

    if (fallbackError || !fallbackData) return null;
    if (fallbackData.status && fallbackData.status !== 'active') return null;
    return normalizeAd(fallbackData);
  }

  return null;
}

export function buildAdMetadata(ad: Ad | null, id: string): Metadata {
  const path = `/anuncio/${id}`;
  const fallbackTitle = `Anúncio no ${SITE_NAME}`;
  const fallbackDescription = 'Veja este anúncio no Dezzapego.';
  const title = ad?.title || fallbackTitle;
  const description = (ad?.description || fallbackDescription).slice(0, 160);
  const image = ad?.images?.[0] ? toAbsoluteUrl(ad.images[0]) : toAbsoluteUrl(getDefaultShareImagePath());
  const canonical = toAbsoluteUrl(path);

  return {
    title,
    description,
    keywords: ad ? getKeywordsForAd(ad) : undefined,
    alternates: {
      canonical,
      languages: {
        'pt-BR': canonical,
        'x-default': canonical,
      },
    },
    robots: ad
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        }
      : {
          index: false,
          follow: true,
        },
    openGraph: {
      locale: 'pt_BR',
      siteName: SITE_NAME,
      type: 'website',
      title,
      description,
      url: canonical,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export function buildAdJsonLd(ad: Ad, id: string) {
  return buildAdDetailStructuredGraph(ad, toAbsoluteUrl(`/anuncio/${id}`), ad.seller.name || 'Vendedor Dezzapego');
}
