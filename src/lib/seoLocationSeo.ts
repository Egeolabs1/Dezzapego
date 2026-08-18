import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface SeoLocationPageData {
  title: string;
  h1: string;
  description: string;
  intro_text: string | null;
  estado: string;
  cidade: string | null;
  slug_type: string | null;
  is_active: boolean;
}

export async function fetchSeoLocationPage(path: string): Promise<SeoLocationPageData | null> {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.rpc('get_seo_location_page', {
    p_path: path,
  });

  if (error || !data) return null;
  return data as unknown as SeoLocationPageData;
}
