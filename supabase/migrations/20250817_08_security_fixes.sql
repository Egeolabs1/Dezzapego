-- =============================================================================
-- FASE 8 — CORREÇÕES DE SEGURANÇA
-- Corrige funções RPC sem verificação de autorização (CRITICAL/HIGH)
-- =============================================================================

-- =============================================================================
-- 1. FIX: update_lead_status — adicionar verificação de membresia
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

  IF NOT EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = v_lead.business_id AND bm.user_id = auth.uid()
    AND bm.role IN ('owner', 'admin', 'manager', 'sales', 'agent')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = v_lead.business_id AND b.owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  UPDATE public.leads
  SET status = p_new_status::public.lead_status, updated_at = now()
  WHERE id = p_lead_id
  RETURNING * INTO v_lead;

  RETURN v_lead;
END;
$$;

-- =============================================================================
-- 2. FIX: get_leads_by_business — adicionar verificação de membresia
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

-- =============================================================================
-- 3. FIX: get_business_dashboard_metrics — adicionar verificação
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

-- =============================================================================
-- 4. FIX: get_lead_with_notes — adicionar verificação
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

-- =============================================================================
-- 5. FIX: add_lead_note — adicionar verificação
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

-- =============================================================================
-- 6. FIX: update_business_collection — adicionar ownership check
-- =============================================================================

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

-- =============================================================================
-- 7. FIX: delete_business_collection — adicionar ownership check
-- =============================================================================

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
-- FIM DAS CORREÇÕES DE SEGURANÇA
-- =============================================================================
