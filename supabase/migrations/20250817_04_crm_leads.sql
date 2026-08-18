-- =============================================================================
-- FASE 4 — CRM, LEADS, PIPELINE, EQUIPE, COLLECTIONS
-- Tabelas: leads, lead_notes, lead_status_history, business_collections,
--          business_collection_listings
-- Atualiza: business_members (roles expandidos)
-- RPCs: CRUD leads, pipeline, métricas, membros, collections
-- =============================================================================

-- =============================================================================
-- 1. Enum de status do pipeline CRM
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
    CREATE TYPE public.lead_status AS ENUM (
      'novo', 'contatado', 'negociando', 'visita', 'proposta', 'vendido', 'perdido'
    );
  END IF;
END $$;

-- =============================================================================
-- 2. Tabela leads — pipeline CRM
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.leads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ad_id             uuid REFERENCES public.ads(id) ON DELETE SET NULL,

  -- dados do contato
  name              text NOT NULL,
  phone             text NOT NULL,
  email             text,

  -- pipeline
  status            public.lead_status DEFAULT 'novo',
  source            text DEFAULT 'manual' CHECK (source IN (
    'whatsapp', 'visita', 'test_drive', 'trade_in', 'chat',
    'telefone', 'formulario', 'manual', 'outro'
  )),
  responsible_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- dados do veículo/imóvel de interesse
  listing_type      text CHECK (listing_type IN ('property', 'vehicle', 'ad')),
  listing_id        uuid,

  -- notas e métricas
  notes             text,
  value             numeric(12,2),

  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS: owner/admin/manager veem todos os leads da empresa
CREATE POLICY "leads_business_team"
  ON public.leads FOR ALL
  USING (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm
      WHERE bm.user_id = auth.uid()
      AND bm.role IN ('owner', 'admin', 'manager', 'sales', 'agent')
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm
      WHERE bm.user_id = auth.uid()
      AND bm.role IN ('owner', 'admin', 'manager', 'sales', 'agent')
    )
  );

-- RLS: owner pode ver tudo
CREATE POLICY "leads_owner_all"
  ON public.leads FOR ALL
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

CREATE INDEX IF NOT EXISTS idx_leads_business ON public.leads(business_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_responsible ON public.leads(responsible_id);
CREATE INDEX IF NOT EXISTS idx_leads_user ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_created ON public.leads(created_at);

COMMENT ON TABLE public.leads IS 'Pipeline CRM — leads de todas as business types';

-- =============================================================================
-- 3. Tabela lead_notes — histórico de notas
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.lead_notes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author_id         uuid NOT NULL REFERENCES auth.users(id),
  text              text NOT NULL,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_notes_team"
  ON public.lead_notes FOR ALL
  USING (
    lead_id IN (
      SELECT l.id FROM public.leads l
      JOIN public.business_members bm ON bm.business_id = l.business_id
      WHERE bm.user_id = auth.uid()
      AND bm.role IN ('owner', 'admin', 'manager', 'sales', 'agent')
    )
  )
  WITH CHECK (
    lead_id IN (
      SELECT l.id FROM public.leads l
      JOIN public.business_members bm ON bm.business_id = l.business_id
      WHERE bm.user_id = auth.uid()
      AND bm.role IN ('owner', 'admin', 'manager', 'sales', 'agent')
    )
  );

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON public.lead_notes(lead_id);

COMMENT ON TABLE public.lead_notes IS 'Notas e observações dos leads no pipeline CRM';

-- =============================================================================
-- 4. Tabela lead_status_history — auditoria de mudanças
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.lead_status_history (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  old_status        public.lead_status,
  new_status        public.lead_status NOT NULL,
  changed_by        uuid NOT NULL REFERENCES auth.users(id),
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_history_team"
  ON public.lead_status_history FOR SELECT
  USING (
    lead_id IN (
      SELECT l.id FROM public.leads l
      JOIN public.business_members bm ON bm.business_id = l.business_id
      WHERE bm.user_id = auth.uid()
    )
  );

CREATE POLICY "lead_history_insert"
  ON public.lead_status_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_lead_history_lead ON public.lead_status_history(lead_id);

COMMENT ON TABLE public.lead_status_history IS 'Histórico de mudanças de status dos leads — auditoria';

-- =============================================================================
-- 5. Trigger: atualizar status history quando lead muda de status
-- =============================================================================

CREATE OR REPLACE FUNCTION public.log_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.lead_status_history (lead_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_lead_status_change') THEN
    CREATE TRIGGER trigger_lead_status_change
      AFTER UPDATE OF status ON public.leads
      FOR EACH ROW EXECUTE FUNCTION public.log_lead_status_change();
  END IF;
END $$;

-- =============================================================================
-- 6. Tabela business_collections — coleções de anúncios
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_collections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name              text NOT NULL,
  slug              text NOT NULL,
  description       text,
  image_url         text,
  sort_order        integer DEFAULT 0,
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE public.business_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collection_owner_all"
  ON public.business_collections FOR ALL
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

CREATE POLICY "collection_public_read"
  ON public.business_collections FOR SELECT
  USING (is_active = true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_collection_slug ON public.business_collections(business_id, slug);
CREATE INDEX IF NOT EXISTS idx_collection_business ON public.business_collections(business_id);

COMMENT ON TABLE public.business_collections IS 'Coleções temáticas de anúncios para vitrine da empresa';

-- =============================================================================
-- 7. Tabela business_collection_listings — pivot collection ↔ listing
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_collection_listings (
  collection_id     uuid NOT NULL REFERENCES public.business_collections(id) ON DELETE CASCADE,
  ad_id             uuid NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  sort_order        integer DEFAULT 0,
  PRIMARY KEY (collection_id, ad_id)
);

ALTER TABLE public.business_collection_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cl_owner"
  ON public.business_collection_listings FOR ALL
  USING (
    collection_id IN (
      SELECT id FROM public.business_collections WHERE business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    collection_id IN (
      SELECT id FROM public.business_collections WHERE business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "cl_public_read"
  ON public.business_collection_listings FOR SELECT
  USING (true);

COMMENT ON TABLE public.business_collection_listings IS 'Vinculação de anúncios a coleções da vitrine';

-- =============================================================================
-- 8. RPC: create_lead
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_lead(
  p_business_id uuid,
  p_name text,
  p_phone text,
  p_email text DEFAULT NULL,
  p_source text DEFAULT 'manual',
  p_ad_id uuid DEFAULT NULL,
  p_listing_type text DEFAULT NULL,
  p_listing_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_responsible_id uuid DEFAULT NULL,
  p_value numeric DEFAULT NULL
) RETURNS public.leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_lead public.leads;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = p_business_id AND owner_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.business_members WHERE business_id = p_business_id AND user_id = auth.uid()
    AND role IN ('owner', 'admin', 'manager', 'sales', 'agent')
  ) THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  INSERT INTO public.leads (
    business_id, user_id, name, phone, email, source,
    ad_id, listing_type, listing_id, notes, responsible_id, value
  ) VALUES (
    p_business_id, auth.uid(), p_name, p_phone, p_email, p_source,
    p_ad_id, p_listing_type, p_listing_id, p_notes, p_responsible_id, p_value
  ) RETURNING * INTO v_lead;

  RETURN v_lead;
END;
$$;

COMMENT ON FUNCTION public.create_lead IS 'Cria um lead no pipeline CRM';

-- =============================================================================
-- 9. RPC: update_lead_status
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_lead_status(
  p_lead_id uuid,
  p_new_status text
) RETURNS public.leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_lead public.leads;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF v_lead IS NULL THEN RAISE EXCEPTION 'Lead não encontrado'; END IF;

  -- Verificar se o usuário é membro da equipe da empresa
  IF NOT EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = v_lead.business_id AND bm.user_id = auth.uid()
    AND bm.role IN ('owner', 'admin', 'manager', 'sales', 'agent')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = v_lead.business_id AND b.owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  UPDATE public.leads
  SET status = p_new_status::public.lead_status,
      updated_at = now()
  WHERE id = p_lead_id
  RETURNING * INTO v_lead;

  RETURN v_lead;
END;
$$;

COMMENT ON FUNCTION public.update_lead_status IS 'Move um lead para novo status no pipeline';

-- =============================================================================
-- 10. RPC: get_leads_by_business
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_leads_by_business(
  p_business_id uuid,
  p_status text DEFAULT NULL,
  p_source text DEFAULT NULL
) RETURNS SETOF public.leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = p_business_id AND bm.user_id = auth.uid()
    AND bm.role IN ('owner', 'admin', 'manager', 'sales', 'agent')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  RETURN QUERY
  SELECT l.* FROM public.leads l
  WHERE l.business_id = p_business_id
    AND (p_status IS NULL OR l.status::text = p_status)
    AND (p_source IS NULL OR l.source = p_source)
  ORDER BY l.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_leads_by_business IS 'Lista leads de uma empresa com filtros';

-- =============================================================================
-- 11. RPC: add_lead_note
-- =============================================================================

CREATE OR REPLACE FUNCTION public.add_lead_note(
  p_lead_id uuid,
  p_text text
) RETURNS public.lead_notes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_note public.lead_notes;
DECLARE v_business_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT business_id INTO v_business_id FROM public.leads WHERE id = p_lead_id;
  IF v_business_id IS NULL THEN RAISE EXCEPTION 'Lead não encontrado'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = v_business_id AND bm.user_id = auth.uid()
    AND bm.role IN ('owner', 'admin', 'manager', 'sales', 'agent')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = v_business_id AND b.owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  INSERT INTO public.lead_notes (lead_id, author_id, text)
  VALUES (p_lead_id, auth.uid(), p_text)
  RETURNING * INTO v_note;

  RETURN v_note;
END;
$$;

COMMENT ON FUNCTION public.add_lead_note IS 'Adiciona uma nota a um lead';

-- =============================================================================
-- 12. RPC: get_lead_with_notes
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_lead_with_notes(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_lead jsonb;
DECLARE v_business_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT business_id INTO v_business_id FROM public.leads WHERE id = p_lead_id;
  IF v_business_id IS NULL THEN RAISE EXCEPTION 'Lead não encontrado'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = v_business_id AND bm.user_id = auth.uid()
    AND bm.role IN ('owner', 'admin', 'manager', 'sales', 'agent')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = v_business_id AND b.owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  SELECT jsonb_build_object(
    'lead', row_to_json(l.*),
    'notes', COALESCE((
      SELECT jsonb_agg(row_to_json(ln.*))
      FROM public.lead_notes ln WHERE ln.lead_id = l.id
      ORDER BY ln.created_at DESC
    ), '[]'::jsonb),
    'history', COALESCE((
      SELECT jsonb_agg(row_to_json(lsh.*))
      FROM public.lead_status_history lsh WHERE lsh.lead_id = l.id
      ORDER BY lsh.created_at DESC
    ), '[]'::jsonb)
  ) INTO v_lead
  FROM public.leads l WHERE l.id = p_lead_id;

  RETURN v_lead;
END;
$$;

COMMENT ON FUNCTION public.get_lead_with_notes IS 'Busca lead com notas e histórico completo';

-- =============================================================================
-- 13. RPC: get_business_dashboard_metrics
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_business_dashboard_metrics(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = p_business_id AND bm.user_id = auth.uid()
    AND bm.role IN ('owner', 'admin', 'manager')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  SELECT jsonb_build_object(
    'total_leads', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id),
    'leads_novo', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id AND status = 'novo'),
    'leads_contatado', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id AND status = 'contatado'),
    'leads_negociando', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id AND status = 'negociando'),
    'leads_visita', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id AND status = 'visita'),
    'leads_proposta', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id AND status = 'proposta'),
    'leads_vendido', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id AND status = 'vendido'),
    'leads_perdido', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id AND status = 'perdido'),
    'active_listings', (SELECT count(*) FROM public.ads WHERE business_id = p_business_id AND status = 'active'),
    'followers', (SELECT followers_count FROM public.businesses WHERE id = p_business_id),
    'total_views', (SELECT COALESCE(sum(views_count), 0) FROM public.ads WHERE business_id = p_business_id),
    'leads_by_source', (
      SELECT COALESCE(jsonb_object_agg(source, cnt), '{}'::jsonb)
      FROM (SELECT source, count(*) as cnt FROM public.leads WHERE business_id = p_business_id GROUP BY source) s
    ),
    'leads_by_week', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('week', week_start, 'count', cnt)), '[]'::jsonb)
      FROM (
        SELECT date_trunc('week', created_at)::date as week_start, count(*) as cnt
        FROM public.leads WHERE business_id = p_business_id
        AND created_at > now() - interval '12 weeks'
        GROUP BY week_start ORDER BY week_start
      ) w
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_business_dashboard_metrics IS 'Métricas consolidadas do dashboard empresarial';

-- =============================================================================
-- 14. RPC: invite_business_member
-- =============================================================================

CREATE OR REPLACE FUNCTION public.invite_business_member(
  p_business_id uuid,
  p_email text,
  p_role text DEFAULT 'agent'
) RETURNS public.business_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_member public.business_members;
DECLARE v_user_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = p_business_id AND owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Apenas o proprietário pode adicionar membros'; END IF;

  -- buscar usuário pelo email
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário com email % não encontrado', p_email;
  END IF;

  -- verificar se já é membro
  IF EXISTS (
    SELECT 1 FROM public.business_members WHERE business_id = p_business_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Usuário já é membro desta empresa';
  END IF;

  INSERT INTO public.business_members (business_id, user_id, role)
  VALUES (p_business_id, v_user_id, p_role)
  RETURNING * INTO v_member;

  RETURN v_member;
END;
$$;

COMMENT ON FUNCTION public.invite_business_member IS 'Convida um usuário para ser membro da empresa';

-- =============================================================================
-- 15. RPC: update_business_member_role
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_business_member_role(
  p_business_id uuid,
  p_user_id uuid,
  p_new_role text
) RETURNS public.business_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_member public.business_members;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = p_business_id AND owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Apenas o proprietário pode alterar papéis'; END IF;

  UPDATE public.business_members
  SET role = p_new_role
  WHERE business_id = p_business_id AND user_id = p_user_id
  RETURNING * INTO v_member;

  IF v_member IS NULL THEN RAISE EXCEPTION 'Membro não encontrado'; END IF;
  RETURN v_member;
END;
$$;

COMMENT ON FUNCTION public.update_business_member_role IS 'Altera o papel de um membro da empresa';

-- =============================================================================
-- 16. RPC: remove_business_member
-- =============================================================================

CREATE OR REPLACE FUNCTION public.remove_business_member(
  p_business_id uuid,
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = p_business_id AND owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Apenas o proprietário pode remover membros'; END IF;

  DELETE FROM public.business_members
  WHERE business_id = p_business_id AND user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.remove_business_member IS 'Remove um membro da empresa';

-- =============================================================================
-- 17. RPC: create/update/delete collection
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_business_collection(
  p_business_id uuid,
  p_name text,
  p_slug text,
  p_description text DEFAULT NULL,
  p_image_url text DEFAULT NULL
) RETURNS public.business_collections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_col public.business_collections;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = p_business_id AND owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  INSERT INTO public.business_collections (business_id, name, slug, description, image_url)
  VALUES (p_business_id, p_name, p_slug, p_description, p_image_url)
  RETURNING * INTO v_col;

  RETURN v_col;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_business_collection(
  p_collection_id uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_sort_order integer DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
) RETURNS public.business_collections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_col public.business_collections;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  -- Verificar ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.business_collections bc
    JOIN public.businesses b ON b.id = bc.business_id
    WHERE bc.id = p_collection_id AND b.owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  UPDATE public.business_collections SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    image_url = COALESCE(p_image_url, image_url),
    sort_order = COALESCE(p_sort_order, sort_order),
    is_active = COALESCE(p_is_active, is_active)
  WHERE id = p_collection_id
  RETURNING * INTO v_col;

  RETURN v_col;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_business_collection(p_collection_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.business_collections bc
    JOIN public.businesses b ON b.id = bc.business_id
    WHERE bc.id = p_collection_id AND b.owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  DELETE FROM public.business_collections WHERE id = p_collection_id;
END;
$$;

-- =============================================================================
-- 18. Trigger: updated_at para leads
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_leads_updated_at') THEN
    CREATE TRIGGER trigger_leads_updated_at
      BEFORE UPDATE ON public.leads
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- FIM DA FASE 4
-- =============================================================================
