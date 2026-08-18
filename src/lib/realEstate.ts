import { supabase } from './supabase';
import type {
  BusinessRealEstate,
  BusinessAgent,
  PropertyLead,
  PropertyVisit,
  LeadStatus,
  VisitStatus,
} from '../types';

// ── BusinessRealEstate ────────────────────────────────────────────

export async function getRealEstateByBusinessId(
  businessId: string,
): Promise<BusinessRealEstate | null> {
  const { data, error } = await supabase
    .from('business_real_estate')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle();
  if (error || !data) return null;
  return data as BusinessRealEstate;
}

export async function upsertRealEstate(
  businessId: string,
  updates: Partial<BusinessRealEstate>,
): Promise<void> {
  const { error } = await supabase
    .from('business_real_estate')
    .upsert({ business_id: businessId, ...updates }, { onConflict: 'business_id' });
  if (error) throw error;
}

// ── Agents ────────────────────────────────────────────────────────

export async function getAgentsByBusinessId(
  businessId: string,
): Promise<BusinessAgent[]> {
  const { data, error } = await supabase
    .from('business_agents')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) return [];
  return (data || []) as BusinessAgent[];
}

export async function getAgentById(agentId: string): Promise<BusinessAgent | null> {
  const { data, error } = await supabase
    .from('business_agents')
    .select('*')
    .eq('id', agentId)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !data) return null;
  return data as BusinessAgent;
}

export async function addAgent(
  agent: Omit<BusinessAgent, 'id' | 'created_at' | 'updated_at'>,
): Promise<BusinessAgent | null> {
  const { data, error } = await supabase
    .from('business_agents')
    .insert(agent)
    .select()
    .single();
  if (error) throw error;
  return data as BusinessAgent;
}

export async function updateAgent(
  agentId: string,
  updates: Partial<BusinessAgent>,
): Promise<void> {
  const { error } = await supabase
    .from('business_agents')
    .update(updates)
    .eq('id', agentId);
  if (error) throw error;
}

export async function removeAgent(agentId: string): Promise<void> {
  const { error } = await supabase
    .from('business_agents')
    .update({ is_active: false })
    .eq('id', agentId);
  if (error) throw error;
}

// ── Leads ─────────────────────────────────────────────────────────

export async function getLeadsByBusinessId(
  businessId: string,
  filters?: { status?: LeadStatus; limit?: number; offset?: number },
): Promise<{ leads: PropertyLead[]; total: number }> {
  let query = supabase
    .from('property_leads')
    .select('*', { count: 'exact' })
    .eq('business_id', businessId);

  if (filters?.status) query = query.eq('status', filters.status);

  query = query
    .order('created_at', { ascending: false })
    .range(
      filters?.offset || 0,
      (filters?.offset || 0) + (filters?.limit || 50) - 1,
    );

  const { data, error, count } = await query;
  if (error) return { leads: [], total: 0 };
  return { leads: (data || []) as PropertyLead[], total: count || 0 };
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
): Promise<void> {
  const { error } = await supabase
    .from('property_leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', leadId);
  if (error) throw error;
}

export async function createLead(params: {
  business_id: string;
  ad_id?: string | null;
  agent_id?: string | null;
  buyer_name: string;
  buyer_phone: string;
  buyer_email?: string | null;
  buyer_whatsapp?: string | null;
  message?: string | null;
  source: string;
}): Promise<void> {
  const { error } = await supabase.from('property_leads').insert({
    business_id: params.business_id,
    ad_id: params.ad_id || null,
    agent_id: params.agent_id || null,
    buyer_name: params.buyer_name,
    buyer_phone: params.buyer_phone,
    buyer_email: params.buyer_email || null,
    buyer_whatsapp: params.buyer_whatsapp || null,
    message: params.message || null,
    source: params.source,
    status: 'new',
  });
  if (error) throw error;
}

export async function getLeadsCountToday(businessId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from('property_leads')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .gte('created_at', today.toISOString());
  if (error) return 0;
  return count || 0;
}

// ── Visits ────────────────────────────────────────────────────────

export async function getVisitsByBusinessId(
  businessId: string,
  filters?: { status?: VisitStatus; limit?: number; offset?: number },
): Promise<{ visits: PropertyVisit[]; total: number }> {
  let query = supabase
    .from('property_visits')
    .select('*', { count: 'exact' })
    .eq('business_id', businessId);

  if (filters?.status) query = query.eq('status', filters.status);

  query = query
    .order('visit_date', { ascending: true })
    .range(
      filters?.offset || 0,
      (filters?.offset || 0) + (filters?.limit || 50) - 1,
    );

  const { data, error, count } = await query;
  if (error) return { visits: [], total: 0 };
  return { visits: (data || []) as PropertyVisit[], total: count || 0 };
}

export async function updateVisitStatus(
  visitId: string,
  status: VisitStatus,
): Promise<void> {
  const { error } = await supabase
    .from('property_visits')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', visitId);
  if (error) throw error;
}

export async function getPendingVisitsCount(businessId: string): Promise<number> {
  const { count, error } = await supabase
    .from('property_visits')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('status', 'pending');
  if (error) return 0;
  return count || 0;
}

// ── Labels ────────────────────────────────────────────────────────

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: 'Novo',
  contatado: 'Contatado',
  negociando: 'Negociando',
  visita: 'Visita/Test Drive',
  proposta: 'Proposta',
  vendido: 'Vendido',
  perdido: 'Perdido',
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  novo: 'bg-blue-100 text-blue-700',
  contatado: 'bg-yellow-100 text-yellow-700',
  negociando: 'bg-purple-100 text-purple-700',
  visita: 'bg-indigo-100 text-indigo-700',
  proposta: 'bg-orange-100 text-orange-700',
  vendido: 'bg-green-100 text-green-700',
  perdido: 'bg-red-100 text-red-700',
};

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmada',
  completed: 'Concluída',
  canceled: 'Cancelada',
  no_show: 'Não Compareceu',
};

export const VISIT_STATUS_COLORS: Record<VisitStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  canceled: 'bg-red-100 text-red-700',
  no_show: 'bg-gray-100 text-gray-600',
};

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  casa: 'Casa',
  apartamento: 'Apartamento',
  terreno: 'Terreno',
  comercial: 'Comercial',
  rural: 'Rural',
  flat: 'Flat',
  kitnet: 'Kitnet',
  cobertura: 'Cobertura',
  loft: 'Loft',
  chacara: 'Chácara',
  fazenda: 'Fazenda',
  sitio: 'Sítio',
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  sale: 'Venda',
  rent: 'Aluguel',
  seasonal: 'Temporada',
  launch: 'Lançamento',
};

export const SPECIALTY_LABELS: Record<string, string> = {
  residencial: 'Residencial',
  comercial: 'Comercial',
  loteamento: 'Loteamento',
  rural: 'Rural',
  industrial: 'Industrial',
};
