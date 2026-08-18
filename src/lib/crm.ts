import { supabase } from './supabase';
import type {
  Lead,
  LeadNote,
  BusinessCollection,
  BusinessDashboardMetrics,
  LeadWithNotes,
  LeadStatus,
  LeadSource,
  BusinessMemberRole,
} from '@/types';

// --- Leads CRUD ---

export async function createLead(data: {
  business_id: string;
  name: string;
  phone: string;
  email?: string;
  source?: LeadSource;
  ad_id?: string;
  listing_type?: string;
  listing_id?: string;
  notes?: string;
  responsible_id?: string;
  value?: number;
}) {
  const { data: result, error } = await supabase.rpc('create_lead', {
    p_business_id: data.business_id,
    p_name: data.name,
    p_phone: data.phone,
    p_email: data.email ?? null,
    p_source: data.source ?? 'manual',
    p_ad_id: data.ad_id ?? null,
    p_listing_type: data.listing_type ?? null,
    p_listing_id: data.listing_id ?? null,
    p_notes: data.notes ?? null,
    p_responsible_id: data.responsible_id ?? null,
    p_value: data.value ?? null,
  });
  if (error) throw error;
  return result as Lead;
}

export async function updateLeadStatus(leadId: string, newStatus: LeadStatus) {
  const { data, error } = await supabase.rpc('update_lead_status', {
    p_lead_id: leadId,
    p_new_status: newStatus,
  });
  if (error) throw error;
  return data as Lead;
}

export async function getLeadsByBusiness(businessId: string, filters?: {
  status?: LeadStatus;
  source?: LeadSource;
}) {
  const { data, error } = await supabase.rpc('get_leads_by_business', {
    p_business_id: businessId,
    p_status: filters?.status ?? null,
    p_source: filters?.source ?? null,
  });
  if (error) throw error;
  return data as Lead[];
}

export async function getLeadWithNotes(leadId: string) {
  const { data, error } = await supabase.rpc('get_lead_with_notes', {
    p_lead_id: leadId,
  });
  if (error) throw error;
  return data as LeadWithNotes;
}

export async function addLeadNote(leadId: string, text: string) {
  const { data, error } = await supabase.rpc('add_lead_note', {
    p_lead_id: leadId,
    p_text: text,
  });
  if (error) throw error;
  return data as LeadNote;
}

// --- Dashboard Metrics ---

export async function getBusinessDashboardMetrics(businessId: string) {
  const { data, error } = await supabase.rpc('get_business_dashboard_metrics', {
    p_business_id: businessId,
  });
  if (error) throw error;
  return data as BusinessDashboardMetrics;
}

// --- Team Members ---

export async function getBusinessMembers(businessId: string) {
  const { data, error } = await supabase
    .from('business_members')
    .select('*, profiles(display_name, avatar_url)')
    .eq('business_id', businessId);
  if (error) throw error;
  return data;
}

export async function inviteBusinessMember(businessId: string, email: string, role: BusinessMemberRole = 'agent') {
  const { data, error } = await supabase.rpc('invite_business_member', {
    p_business_id: businessId,
    p_email: email,
    p_role: role,
  });
  if (error) throw error;
  return data;
}

export async function updateBusinessMemberRole(businessId: string, userId: string, newRole: BusinessMemberRole) {
  const { data, error } = await supabase.rpc('update_business_member_role', {
    p_business_id: businessId,
    p_user_id: userId,
    p_new_role: newRole,
  });
  if (error) throw error;
  return data;
}

export async function removeBusinessMember(businessId: string, userId: string) {
  const { error } = await supabase.rpc('remove_business_member', {
    p_business_id: businessId,
    p_user_id: userId,
  });
  if (error) throw error;
}

// --- Collections ---

export async function listBusinessCollections(businessId: string) {
  const { data, error } = await supabase
    .from('business_collections')
    .select('*')
    .eq('business_id', businessId)
    .order('sort_order');
  if (error) throw error;
  return data as BusinessCollection[];
}

export async function createBusinessCollection(data: {
  business_id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
}) {
  const { data: result, error } = await supabase.rpc('create_business_collection', {
    p_business_id: data.business_id,
    p_name: data.name,
    p_slug: data.slug,
    p_description: data.description ?? null,
    p_image_url: data.image_url ?? null,
  });
  if (error) throw error;
  return result as BusinessCollection;
}

export async function updateBusinessCollection(collectionId: string, data: Partial<{
  name: string;
  description: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}>) {
  const params: Record<string, unknown> = { p_collection_id: collectionId };
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) params[`p_${key}`] = value;
  }
  const { data: result, error } = await supabase.rpc('update_business_collection', params);
  if (error) throw error;
  return result as BusinessCollection;
}

export async function deleteBusinessCollection(collectionId: string) {
  const { error } = await supabase.rpc('delete_business_collection', {
    p_collection_id: collectionId,
  });
  if (error) throw error;
}
