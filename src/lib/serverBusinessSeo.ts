import { createClient } from '@supabase/supabase-js';
import type { Business, Profile } from '../types';

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
    global: { headers: { 'x-client-info': 'business-seo-server' } },
  });
  return _serverSupabase;
}

export async function fetchBusinessForSeo(slug: string): Promise<Business | null> {
  const supabase = getServerSupabase();
  if (!supabase || !slug) return null;

  try {
    const { data: rpcData, error: rpcError } = await (supabase.rpc as unknown as (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)(
      'get_business_by_slug',
      { p_slug: slug },
    );
    if (!rpcError && rpcData) return rpcData as Business;

    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle<Business>();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function fetchProfileForSeo(id: string): Promise<Profile | null> {
  const supabase = getServerSupabase();
  if (!supabase || !id) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, full_name, avatar_url, bio, city, state, created_at')
      .eq('id', id)
      .maybeSingle<Profile>();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}
