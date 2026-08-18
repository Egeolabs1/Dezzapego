import { supabase } from './supabase';
import type { SeoLocationPage } from '@/types';

/**
 * Wrapper com timeout — evita que a RPC do Supabase trave infinitamente
 * (ex.: ambiente de teste sem rede / seed não aplicado).
 */
function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}: timeout after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

const RPC_TIMEOUT_MS = 8_000;

export async function getSeoLocationPage(path: string) {
  const { data, error } = await withTimeout(
    supabase.rpc('get_seo_location_page', { p_path: path }),
    RPC_TIMEOUT_MS,
    'get_seo_location_page',
  );
  if (error) throw error;
  return data as SeoLocationPage | null;
}

export async function getSitemapEntries() {
  const { data, error } = await supabase.rpc('get_seo_sitemap_entries');
  if (error) throw error;
  return data as { path: string; title: string; updated_at: string }[];
}

export function generateStructuredData(type: 'Organization' | 'LocalBusiness' | 'AutoDealer' | 'RealEstateAgent' | 'Product' | 'WebPage', data: Record<string, unknown>) {
  return {
    '@context': 'https://schema.org',
    '@type': type,
    ...data,
  };
}

export function generateBreadcrumbStructuredData(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}


