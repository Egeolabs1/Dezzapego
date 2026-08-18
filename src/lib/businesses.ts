import { supabase } from './supabase';
import type { Business } from '../types';

/**
 * Busca empresa por slug (público)
 */
export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  const { data, error } = await supabase.rpc('get_business_by_slug', { p_slug: slug });
  if (error || !data) return null;
  return data as Business;
}

/**
 * Busca empresa por ID
 */
export async function getBusinessById(id: string): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single();
  if (error) return null;
  return data as Business;
}

/**
 * Cria uma nova empresa
 */
export async function createBusiness(params: {
  name: string;
  type?: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
}): Promise<Business | null> {
  const { data, error } = await supabase.rpc('create_business', {
    p_name: params.name,
    p_type: params.type || 'generic',
    p_description: params.description || null,
    p_phone: params.phone || null,
    p_whatsapp: params.whatsapp || null,
    p_email: params.email || null,
    p_city: params.city || null,
    p_state: params.state || null,
    p_neighborhood: params.neighborhood || null,
  });
  if (error) throw error;
  return data as Business;
}

/**
 * Atualiza dados da empresa (apenas owner/admin)
 */
export async function updateBusiness(id: string, updates: Partial<Business>): Promise<void> {
  const { error } = await supabase
    .from('businesses')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

/**
 * Verifica se o usuário logado é dono da empresa
 */
export async function isBusinessOwner(businessId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_business_owner', { p_business_id: businessId });
  if (error) return false;
  return data === true;
}

/**
 * Segue uma empresa
 */
export async function followBusiness(businessId: string): Promise<void> {
  const { error } = await supabase.rpc('follow_business', { p_business_id: businessId });
  if (error) throw error;
}

/**
 * Deixa de seguir uma empresa
 */
export async function unfollowBusiness(businessId: string): Promise<void> {
  const { error } = await supabase.rpc('unfollow_business', { p_business_id: businessId });
  if (error) throw error;
}

/**
 * Verifica se o usuário segue uma empresa
 */
export async function isFollowingBusiness(businessId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase
    .from('business_followers')
    .select('id')
    .eq('business_id', businessId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) return false;
  return data !== null;
}

/**
 * Lista empresas (com filtros)
 */
export async function listBusinesses(params: {
  type?: string;
  city?: string;
  state?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ businesses: Business[]; total: number }> {
  let query = supabase
    .from('businesses')
    .select('*', { count: 'exact' })
    .eq('is_active', true);

  if (params.type) query = query.eq('type', params.type);
  if (params.city) query = query.eq('city', params.city);
  if (params.state) query = query.eq('state', params.state);
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }

  query = query.order('rating', { ascending: false })
    .range(params.offset || 0, (params.offset || 0) + (params.limit || 20) - 1);

  const { data, error, count } = await query;
  if (error) return { businesses: [], total: 0 };

  return {
    businesses: (data || []) as Business[],
    total: count || 0,
  };
}

/**
 * Labels dos tipos de empresa
 */
export const BUSINESS_TYPE_LABELS: Record<string, string> = {
  generic: 'Empresa',
  real_estate: 'Imobiliária',
  vehicle_dealer: 'Loja de Veículos',
  professional: 'Profissional',
  store: 'Loja',
};

/**
 * Labels dos horários de funcionamento
 */
export const DAY_LABELS: Record<string, string> = {
  mon: 'Segunda',
  tue: 'Terça',
  wed: 'Quarta',
  thu: 'Quinta',
  fri: 'Sexta',
  sat: 'Sábado',
  sun: 'Domingo',
};
