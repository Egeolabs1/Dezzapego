-- Feature enforcement: server-side function to check plan access
-- This function is called by the frontend BEFORE allowing access to Pro features

CREATE OR REPLACE FUNCTION public.enforce_feature_access(
  p_business_id uuid,
  p_feature_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_has_feature boolean := false;
  v_subscription_status text;
BEGIN
  -- Check subscription status
  SELECT bs.status INTO v_subscription_status
  FROM public.business_subscriptions bs
  WHERE bs.business_id = p_business_id
    AND bs.status = 'active'
  LIMIT 1;

  -- No active subscription = free plan
  IF v_subscription_status IS NULL THEN
    RETURN CASE p_feature_name
      WHEN 'crm' THEN false
      WHEN 'collections' THEN false
      WHEN 'import_csv' THEN false
      WHEN 'api' THEN false
      WHEN 'advanced_metrics' THEN false
      WHEN 'sponsored' THEN false
      ELSE true
    END;
  END IF;

  -- Active subscription: check via check_feature_flag
  SELECT public.check_feature_flag(p_business_id, p_feature_name) INTO v_has_feature;
  RETURN COALESCE(v_has_feature, false);
END;
$$;

COMMENT ON FUNCTION public.enforce_feature_access(uuid, text) IS 'Verifica acesso a feature no servidor — retorna true/false para o cliente';

-- Grant execute to authenticated users (they call this via Supabase client)
GRANT EXECUTE ON FUNCTION public.enforce_feature_access(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_feature_access(uuid, text) TO anon;
