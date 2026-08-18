-- Dezzapego Empresas — FASE 2: REAL ESTATE (Imobiliárias)
-- business_real_estate + business_agents + property_leads + property_visits + business_bairros

-- =============================================================================
-- 1. business_real_estate — dados específicos de imobiliárias
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_real_estate (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  creci text,
  creci_type text DEFAULT 'pj' CHECK (creci_type IN ('pj','pf')),
  specialties text[] DEFAULT '{}',
  regions text[] DEFAULT '{}',
  transaction_types text[] DEFAULT '{buy,sell,rent,seasonal,launch}',
  team_size integer DEFAULT 1,
  years_experience integer,
  properties_sold integer DEFAULT 0,
  avg_sale_price numeric,
  video_url text,
  whatsapp_message text DEFAULT 'Olá! Vim pelo Dezzapego e tenho interesse em um imóvel.',
  accepts_whatsapp boolean DEFAULT true,
  accepts_phone boolean DEFAULT true,
  accepts_visit boolean DEFAULT true,
  visit_scheduling_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================================================
-- 2. business_agents — corretores vinculados à imobiliária
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  creci text,
  creci_type text DEFAULT 'pf' CHECK (creci_type IN ('pf','pj')),
  phone text,
  whatsapp text,
  email text,
  avatar_url text,
  bio text,
  specialties text[] DEFAULT '{}',
  regions text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================================================
-- 3. property_leads — leads gerados pela imobiliária
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.property_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  ad_id uuid REFERENCES public.ads(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.business_agents(id) ON DELETE SET NULL,
  buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_name text,
  buyer_phone text,
  buyer_email text,
  buyer_whatsapp text,
  message text,
  source text DEFAULT 'whatsapp' CHECK (source IN ('whatsapp','phone','form','visit','chat')),
  status text DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','scheduled','converted','lost')),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================================================
-- 4. property_visits — agendamento de visitas a imóveis
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.property_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  ad_id uuid REFERENCES public.ads(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.business_agents(id) ON DELETE SET NULL,
  buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_name text NOT NULL,
  buyer_phone text NOT NULL,
  buyer_email text,
  visit_date date NOT NULL,
  visit_time time NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','canceled','no_show')),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================================================
-- 5. business_bairros — bairros onde a imobiliária atua
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_bairros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  city text NOT NULL,
  state text NOT NULL,
  neighborhood text NOT NULL,
  property_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (business_id, city, state, neighborhood)
);

-- =============================================================================
-- 6. Colunas adicionais na tabela ads (imóveis)
-- =============================================================================

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.business_agents(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS property_type text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS transaction_type text CHECK (transaction_type IN ('sale','rent','seasonal','launch'));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS bedrooms integer;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS bathrooms integer;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS parking_spots integer;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS area_m2 numeric;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS lot_area_m2 numeric;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS floor_number integer;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS total_floors integer;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS year_built integer;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS furnished boolean DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS condominium_fee numeric;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS iptu_monthly numeric;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- property_type é opcional — só preenchido para anúncios da categoria Imóveis.
-- Não aplicar CHECK constraint aqui; a validação é feita na aplicação (frontend + RPC).
-- Se desejar forçar no banco futuro, usar: CHECK (property_type IS NULL OR category = 'Imóveis')

-- =============================================================================
-- 7. Índices
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_bre_business ON public.business_real_estate(business_id);
CREATE INDEX IF NOT EXISTS idx_ba_business ON public.business_agents(business_id);
CREATE INDEX IF NOT EXISTS idx_ba_user ON public.business_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_ba_creci ON public.business_agents(creci) WHERE creci IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ba_unique_creci ON public.business_agents(business_id, creci) WHERE creci IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pl_business ON public.property_leads(business_id);
CREATE INDEX IF NOT EXISTS idx_pl_status ON public.property_leads(status);
CREATE INDEX IF NOT EXISTS idx_pv_business ON public.property_visits(business_id);
CREATE INDEX IF NOT EXISTS idx_pv_date ON public.property_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_bb_business ON public.business_bairros(business_id);
CREATE INDEX IF NOT EXISTS idx_ads_agent ON public.ads(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ads_property_type ON public.ads(property_type) WHERE property_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ads_transaction_type ON public.ads(transaction_type) WHERE transaction_type IS NOT NULL;

-- =============================================================================
-- 8. RLS — Habilitar Row Level Security em todas as tabelas
-- =============================================================================

ALTER TABLE public.business_real_estate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_bairros ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 9. RLS Policies — business_real_estate
-- =============================================================================

SELECT create_policy_if_missing('public','business_real_estate','Owner read',
  $$CREATE POLICY "Owner read" ON public.business_real_estate
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_real_estate.business_id AND b.owner_id = auth.uid()))$$);

SELECT create_policy_if_missing('public','business_real_estate','Owner manage',
  $$CREATE POLICY "Owner manage" ON public.business_real_estate
    FOR ALL USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_real_estate.business_id AND b.owner_id = auth.uid()))$$);

SELECT create_policy_if_missing('public','business_real_estate','Admin manage',
  $$CREATE POLICY "Admin manage" ON public.business_real_estate
    FOR ALL USING (is_admin())$$);

-- =============================================================================
-- 10. RLS Policies — business_agents
-- =============================================================================

SELECT create_policy_if_missing('public','business_agents','Public read active agents',
  $$CREATE POLICY "Public read active agents" ON public.business_agents
    FOR SELECT USING (is_active = true)$$);

SELECT create_policy_if_missing('public','business_agents','Business members view agents',
  $$CREATE POLICY "Business members view agents" ON public.business_agents
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id = business_agents.business_id AND bm.user_id = auth.uid() AND bm.status = 'active'))$$);

SELECT create_policy_if_missing('public','business_agents','Owner manage agents',
  $$CREATE POLICY "Owner manage agents" ON public.business_agents
    FOR ALL USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_agents.business_id AND b.owner_id = auth.uid()))$$);

SELECT create_policy_if_missing('public','business_agents','Admin manage agents',
  $$CREATE POLICY "Admin manage agents" ON public.business_agents
    FOR ALL USING (is_admin())$$);

-- =============================================================================
-- 11. RLS Policies — property_leads
-- =============================================================================

SELECT create_policy_if_missing('public','property_leads','Business members view leads',
  $$CREATE POLICY "Business members view leads" ON public.property_leads
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id = property_leads.business_id AND bm.user_id = auth.uid() AND bm.status = 'active'))$$);

SELECT create_policy_if_missing('public','property_leads','Business members manage leads',
  $$CREATE POLICY "Business members manage leads" ON public.property_leads
    FOR ALL USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = property_leads.business_id AND b.owner_id = auth.uid()))$$);

SELECT create_policy_if_missing('public','property_leads','Buyer view own leads',
  $$CREATE POLICY "Buyer view own leads" ON public.property_leads
    FOR SELECT USING (buyer_id = auth.uid())$$);

SELECT create_policy_if_missing('public','property_leads','Buyer create leads',
  $$CREATE POLICY "Buyer create leads" ON public.property_leads
    FOR INSERT WITH CHECK (buyer_id = auth.uid() OR buyer_id IS NULL)$$);

SELECT create_policy_if_missing('public','property_leads','Admin manage leads',
  $$CREATE POLICY "Admin manage leads" ON public.property_leads
    FOR ALL USING (is_admin())$$);

-- =============================================================================
-- 12. RLS Policies — property_visits
-- =============================================================================

SELECT create_policy_if_missing('public','property_visits','Business members view visits',
  $$CREATE POLICY "Business members view visits" ON public.property_visits
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id = property_visits.business_id AND bm.user_id = auth.uid() AND bm.status = 'active'))$$);

SELECT create_policy_if_missing('public','property_visits','Business members manage visits',
  $$CREATE POLICY "Business members manage visits" ON public.property_visits
    FOR ALL USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = property_visits.business_id AND b.owner_id = auth.uid()))$$);

SELECT create_policy_if_missing('public','property_visits','Buyer view own visits',
  $$CREATE POLICY "Buyer view own visits" ON public.property_visits
    FOR SELECT USING (buyer_id = auth.uid())$$);

SELECT create_policy_if_missing('public','property_visits','Buyer create visits',
  $$CREATE POLICY "Buyer create visits" ON public.property_visits
    FOR INSERT WITH CHECK (buyer_id = auth.uid() OR buyer_id IS NULL)$$);

SELECT create_policy_if_missing('public','property_visits','Admin manage visits',
  $$CREATE POLICY "Admin manage visits" ON public.property_visits
    FOR ALL USING (is_admin())$$);

-- =============================================================================
-- 13. RLS Policies — business_bairros
-- =============================================================================

SELECT create_policy_if_missing('public','business_bairros','Public read bairros',
  $$CREATE POLICY "Public read bairros" ON public.business_bairros
    FOR SELECT USING (true)$$);

SELECT create_policy_if_missing('public','business_bairros','Owner manage bairros',
  $$CREATE POLICY "Owner manage bairros" ON public.business_bairros
    FOR ALL USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_bairros.business_id AND b.owner_id = auth.uid()))$$);

SELECT create_policy_if_missing('public','business_bairros','Admin manage bairros',
  $$CREATE POLICY "Admin manage bairros" ON public.business_bairros
    FOR ALL USING (is_admin())$$);

-- =============================================================================
-- 14. Triggers — updated_at automático
-- =============================================================================

SELECT create_trigger_if_missing('public','business_real_estate','trg_bre_updated_at',
  'CREATE TRIGGER trg_bre_updated_at BEFORE UPDATE ON public.business_real_estate FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()');

SELECT create_trigger_if_missing('public','business_agents','trg_ba_updated_at',
  'CREATE TRIGGER trg_ba_updated_at BEFORE UPDATE ON public.business_agents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()');

SELECT create_trigger_if_missing('public','property_leads','trg_pl_updated_at',
  'CREATE TRIGGER trg_pl_updated_at BEFORE UPDATE ON public.property_leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()');

SELECT create_trigger_if_missing('public','property_visits','trg_pv_updated_at',
  'CREATE TRIGGER trg_pv_updated_at BEFORE UPDATE ON public.property_visits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()');

-- =============================================================================
-- 15. RPC: get_business_agents — listar corretores ativos de uma imobiliária
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_business_agents(p_business_id uuid)
RETURNS SETOF public.business_agents
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT *
  FROM public.business_agents
  WHERE business_id = p_business_id
    AND is_active = true
  ORDER BY sort_order ASC, name ASC;
$$;

-- =============================================================================
-- 16. RPC: create_property_lead — criar um lead a partir de interesse do comprador
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_property_lead(
  p_business_id uuid,
  p_ad_id uuid DEFAULT NULL,
  p_agent_id uuid DEFAULT NULL,
  p_buyer_name text DEFAULT NULL,
  p_buyer_phone text DEFAULT NULL,
  p_buyer_email text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_source text DEFAULT 'whatsapp'
) RETURNS public.property_leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.property_leads;
  v_buyer_id uuid := auth.uid();
BEGIN
  INSERT INTO public.property_leads (
    business_id, ad_id, agent_id, buyer_id,
    buyer_name, buyer_phone, buyer_email, buyer_whatsapp,
    message, source
  ) VALUES (
    p_business_id, p_ad_id, p_agent_id, v_buyer_id,
    p_buyer_name, p_buyer_phone, p_buyer_email, p_buyer_phone,
    p_message, p_source
  )
  RETURNING * INTO v_lead;

  RETURN v_lead;
END;
$$;

-- =============================================================================
-- 17. RPC: schedule_property_visit — agendar uma visita ao imóvel
-- =============================================================================

CREATE OR REPLACE FUNCTION public.schedule_property_visit(
  p_business_id uuid,
  p_buyer_name text,
  p_buyer_phone text,
  p_visit_date date,
  p_visit_time time,
  p_ad_id uuid DEFAULT NULL,
  p_agent_id uuid DEFAULT NULL,
  p_buyer_email text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS public.property_visits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit public.property_visits;
  v_buyer_id uuid := auth.uid();
BEGIN
  IF p_buyer_name IS NULL OR p_buyer_name = '' THEN
    RAISE EXCEPTION 'Nome do comprador é obrigatório.';
  END IF;

  IF p_buyer_phone IS NULL OR p_buyer_phone = '' THEN
    RAISE EXCEPTION 'Telefone do comprador é obrigatório.';
  END IF;

  IF p_visit_date IS NULL THEN
    RAISE EXCEPTION 'Data da visita é obrigatória.';
  END IF;

  IF p_visit_time IS NULL THEN
    RAISE EXCEPTION 'Horário da visita é obrigatório.';
  END IF;

  IF p_visit_date < current_date THEN
    RAISE EXCEPTION 'A data da visita não pode ser no passado.';
  END IF;

  INSERT INTO public.property_visits (
    business_id, ad_id, agent_id, buyer_id,
    buyer_name, buyer_phone, buyer_email,
    visit_date, visit_time, notes
  ) VALUES (
    p_business_id, p_ad_id, p_agent_id, v_buyer_id,
    p_buyer_name, p_buyer_phone, p_buyer_email,
    p_visit_date, p_visit_time, p_notes
  )
  RETURNING * INTO v_visit;

  RETURN v_visit;
END;
$$;

-- =============================================================================
-- 18. RPC: get_property_leads — listar leads de uma imobiliária (somente owner)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_property_leads(p_business_id uuid)
RETURNS SETOF public.property_leads
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT pl.*
  FROM public.property_leads pl
  WHERE pl.business_id = p_business_id
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = pl.business_id AND b.owner_id = auth.uid()
    )
  ORDER BY pl.created_at DESC;
$$;

-- =============================================================================
-- 19. RPC: get_property_visits — listar visitas de uma imobiliária (somente owner)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_property_visits(
  p_business_id uuid,
  p_date date DEFAULT NULL
) RETURNS SETOF public.property_visits
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT pv.*
  FROM public.property_visits pv
  WHERE pv.business_id = p_business_id
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = pv.business_id AND b.owner_id = auth.uid()
    )
    AND (p_date IS NULL OR pv.visit_date = p_date)
  ORDER BY pv.visit_date ASC, pv.visit_time ASC;
$$;

-- =============================================================================
-- 20. RPC: update_ads_count — manter businesses.ads_count sincronizado
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_ads_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
BEGIN
  -- Determinar qual business_id afetado
  IF TG_OP = 'DELETE' THEN
    v_business_id := OLD.business_id;
  ELSE
    v_business_id := NEW.business_id;
  END IF;

  -- Se o business_id mudou (UPDATE com reatribuição), atualizar ambos
  IF TG_OP = 'UPDATE' AND OLD.business_id IS DISTINCT FROM NEW.business_id THEN
    -- Decrementar no business antigo
    IF OLD.business_id IS NOT NULL THEN
      UPDATE public.businesses
      SET ads_count = GREATEST(ads_count - 1, 0)
      WHERE id = OLD.business_id;
    END IF;
    -- Incrementar no business novo
    IF NEW.business_id IS NOT NULL THEN
      UPDATE public.businesses
      SET ads_count = ads_count + 1
      WHERE id = NEW.business_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Para INSERT/DELETE/UPDATE sem mudança de business_id
  IF v_business_id IS NOT NULL THEN
    UPDATE public.businesses
    SET ads_count = (
      SELECT COUNT(*)::integer
      FROM public.ads
      WHERE business_id = v_business_id
    )
    WHERE id = v_business_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger para manter ads_count sincronizado
SELECT create_trigger_if_missing('public','ads','trg_ads_sync_count',
  'CREATE TRIGGER trg_ads_sync_count AFTER INSERT OR UPDATE OR DELETE ON public.ads FOR EACH ROW EXECUTE FUNCTION public.update_ads_count()');

-- =============================================================================
-- 21. Comentários nas tabelas
-- =============================================================================

COMMENT ON TABLE public.business_real_estate IS 'Dados específicos de imobiliárias — extensão da tabela businesses.';
COMMENT ON TABLE public.business_agents IS 'Corretores vinculados a uma imobiliária.';
COMMENT ON TABLE public.property_leads IS 'Leads gerados por interações com anúncios de imóveis.';
COMMENT ON TABLE public.property_visits IS 'Agendamento de visitas presenciais a imóveis.';
COMMENT ON TABLE public.business_bairros IS 'Bairros onde a imobiliária atua, com contagem de imóveis.';
