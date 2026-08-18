import { supabase } from './supabase';
import type { PlanFeatures } from '@/types';

export async function getPlanFeatures(businessId: string) {
  const { data, error } = await supabase.rpc('get_plan_features', {
    p_business_id: businessId,
  });
  if (error) throw error;
  return data as PlanFeatures;
}

/**
 * Server-side feature access check. Returns true if the business has access.
 */
export async function checkFeatureAccess(
  businessId: string,
  featureName: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('enforce_feature_access', {
    p_business_id: businessId,
    p_feature_name: featureName,
  });
  if (error) return false;
  return Boolean(data);
}
