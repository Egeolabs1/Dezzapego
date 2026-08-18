-- =============================================================================
-- FASE 7 — PLANOS, MONETIZAÇÃO, FEATURE FLAGS
-- Tabelas: business_plans, business_subscriptions, business_feature_flags,
--          sponsored_listings
-- RPCs: get_plan_features, check_feature_flag, get_active_plan
-- =============================================================================

-- =============================================================================
-- 1. Enum de planos
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_plan_tier') THEN
    CREATE TYPE public.business_plan_tier AS ENUM ('free', 'pro', 'max');
  END IF;
END $$;

-- =============================================================================
-- 2. Tabela business_plans — definição dos planos
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_plans (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier              public.business_plan_tier UNIQUE NOT NULL,
  name              text NOT NULL,
  price_monthly     numeric(10,2) DEFAULT 0,
  price_yearly      numeric(10,2) DEFAULT 0,
  max_listings      integer DEFAULT 5,
  max_members       integer DEFAULT 1,
  has_crm           boolean DEFAULT false,
  has_collections   boolean DEFAULT false,
  has_import_csv    boolean DEFAULT false,
  has_api           boolean DEFAULT false,
  has_advanced_metrics boolean DEFAULT false,
  has_priority_support boolean DEFAULT false,
  has_sponsored     boolean DEFAULT false,
  features          jsonb DEFAULT '{}'::jsonb,
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE public.business_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_public_read"
  ON public.business_plans FOR SELECT
  USING (is_active = true);

-- Inserir planos padrão
INSERT INTO public.business_plans (tier, name, price_monthly, price_yearly, max_listings, max_members, has_crm, has_collections, has_import_csv, has_api, has_advanced_metrics, has_priority_support, has_sponsored, features)
VALUES
  ('free', 'Empresa Free', 0, 0, 5, 1, false, false, false, false, false, false, false, '{"analytics_basic": true}'::jsonb),
  ('pro', 'Empresa Pro', 49.90, 479.00, 50, 5, true, true, true, false, true, false, true, '{"analytics_advanced": true, "lead_pipeline": true, "team_management": true}'::jsonb),
  ('max', 'Empresa Max', 149.90, 1439.00, -1, 20, true, true, true, true, true, true, true, '{"analytics_advanced": true, "lead_pipeline": true, "team_management": true, "api_access": true, "priority_listing": true}'::jsonb)
ON CONFLICT (tier) DO NOTHING;

COMMENT ON TABLE public.business_plans IS 'Planos de assinatura para empresas — definição de limites e features';

-- =============================================================================
-- 3. Tabela business_subscriptions — assinaturas ativas
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_subscriptions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_id           uuid NOT NULL REFERENCES public.business_plans(id),
  tier              public.business_plan_tier NOT NULL DEFAULT 'free',
  status            text DEFAULT 'active' CHECK (status IN ('active','cancelled','expired','past_due')),
  started_at        timestamptz DEFAULT now(),
  expires_at        timestamptz,
  payment_method    text,
  external_id       text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_owner"
  ON public.business_subscriptions FOR ALL
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_subscription_business ON public.business_subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_subscription_status ON public.business_subscriptions(status);

COMMENT ON TABLE public.business_subscriptions IS 'Assinaturas de planos das empresas — rastreia status e expiração';

-- =============================================================================
-- 4. Tabela business_feature_flags — flags por empresa
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_feature_flags (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  flag_name         text NOT NULL,
  is_enabled        boolean DEFAULT true,
  config            jsonb DEFAULT '{}'::jsonb,
  created_at        timestamptz DEFAULT now(),
  UNIQUE(business_id, flag_name)
);

ALTER TABLE public.business_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flag_owner"
  ON public.business_feature_flags FOR ALL
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_ff_business ON public.business_feature_flags(business_id);
CREATE INDEX IF NOT EXISTS idx_ff_flag ON public.business_feature_flags(flag_name);

COMMENT ON TABLE public.business_feature_flags IS 'Feature flags individuais por empresa — override dos planos';

-- =============================================================================
-- 5. Tabela sponsored_listings — destaque patrocinado
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sponsored_listings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id             uuid NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  business_id       uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sponsor_type      text NOT NULL CHECK (sponsor_type IN ('highlight','priority','category','regional')),
  start_date        timestamptz DEFAULT now(),
  end_date          timestamptz NOT NULL,
  budget            numeric(10,2),
  spent             numeric(10,2) DEFAULT 0,
  status            text DEFAULT 'active' CHECK (status IN ('active','paused','expired','completed')),
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE public.sponsored_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sponsored_owner"
  ON public.sponsored_listings FOR ALL
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "sponsored_public_read"
  ON public.sponsored_listings FOR SELECT
  USING (status = 'active' AND end_date > now());

CREATE INDEX IF NOT EXISTS idx_sponsored_ad ON public.sponsored_listings(ad_id);
CREATE INDEX IF NOT EXISTS idx_sponsored_business ON public.sponsored_listings(business_id);
CREATE INDEX IF NOT EXISTS idx_sponsored_status ON public.sponsored_listings(status);

COMMENT ON TABLE public.sponsored_listings IS 'Anúncios patrocinados — destaque, prioridade, categoria, regional';

-- =============================================================================
-- 6. RPC: get_active_plan — plano ativo da empresa
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_active_plan(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'plan', row_to_json(bp.*),
    'subscription', row_to_json(bs.*)
  ) INTO v_result
  FROM public.business_plans bp
  LEFT JOIN public.business_subscriptions bs ON bs.plan_id = bp.id AND bs.business_id = p_business_id AND bs.status = 'active'
  WHERE bp.tier = COALESCE(
    (SELECT tier FROM public.business_subscriptions WHERE business_id = p_business_id AND status = 'active' ORDER BY created_at DESC LIMIT 1),
    'free'::public.business_plan_tier
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_active_plan IS 'Retorna o plano ativo de uma empresa (Free se não tiver assinatura)';

-- =============================================================================
-- 7. RPC: check_feature_flag — verificar feature flag
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_feature_flag(
  p_business_id uuid,
  p_flag_name text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_override boolean;
DECLARE v_plan_feature boolean;
BEGIN
  -- 1. Verificar override individual da empresa
  SELECT is_enabled INTO v_override
  FROM public.business_feature_flags
  WHERE business_id = p_business_id AND flag_name = p_flag_name;

  IF v_override IS NOT NULL THEN
    RETURN v_override;
  END IF;

  -- 2. Verificar feature do plano
  SELECT CASE
    WHEN p_flag_name = 'crm' THEN bp.has_crm
    WHEN p_flag_name = 'collections' THEN bp.has_collections
    WHEN p_flag_name = 'import_csv' THEN bp.has_import_csv
    WHEN p_flag_name = 'api' THEN bp.has_api
    WHEN p_flag_name = 'advanced_metrics' THEN bp.has_advanced_metrics
    WHEN p_flag_name = 'priority_support' THEN bp.has_priority_support
    WHEN p_flag_name = 'sponsored' THEN bp.has_sponsored
    ELSE false
  END INTO v_plan_feature
  FROM public.business_plans bp
  WHERE bp.tier = COALESCE(
    (SELECT tier FROM public.business_subscriptions WHERE business_id = p_business_id AND status = 'active' ORDER BY created_at DESC LIMIT 1),
    'free'::public.business_plan_tier
  );

  RETURN COALESCE(v_plan_feature, false);
END;
$$;

COMMENT ON FUNCTION public.check_feature_flag IS 'Verifica se uma feature está disponível para uma empresa (plano + override)';

-- =============================================================================
-- 8. RPC: get_plan_features — todas as features do plano
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_plan_features(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_tier public.business_plan_tier;
DECLARE v_result jsonb;
BEGIN
  SELECT COALESCE(
    (SELECT tier FROM public.business_subscriptions WHERE business_id = p_business_id AND status = 'active' ORDER BY created_at DESC LIMIT 1),
    'free'::public.business_plan_tier
  ) INTO v_tier;

  SELECT jsonb_build_object(
    'tier', bp.tier,
    'name', bp.name,
    'max_listings', bp.max_listings,
    'max_members', bp.max_members,
    'has_crm', bp.has_crm,
    'has_collections', bp.has_collections,
    'has_import_csv', bp.has_import_csv,
    'has_api', bp.has_api,
    'has_advanced_metrics', bp.has_advanced_metrics,
    'has_priority_support', bp.has_priority_support,
    'has_sponsored', bp.has_sponsored,
    'features', bp.features
  ) INTO v_result
  FROM public.business_plans bp
  WHERE bp.tier = v_tier;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_plan_features IS 'Retorna todas as features e limites do plano da empresa';

-- =============================================================================
-- FIM DA FASE 7
-- =============================================================================
