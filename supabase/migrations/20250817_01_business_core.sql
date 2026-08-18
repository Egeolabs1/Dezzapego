-- Dezzapego Empresas — FASE 1: CORE BUSINESS
-- businesses + business_members + business_followers

-- 1. businesses
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  type text NOT NULL DEFAULT 'generic' CHECK (type IN ('generic','real_estate','vehicle_dealer','professional','store')),
  description text, logo_url text, cover_url text, highlight_color text DEFAULT '#2563EB',
  phone text, whatsapp text, email text, website text, instagram text, facebook text, cnpj text,
  address text, neighborhood text, city text, state text, cep text,
  lat double precision, lng double precision,
  opening_hours jsonb DEFAULT '{}'::jsonb,
  attendance_options jsonb DEFAULT '["whatsapp","phone","in_person"]'::jsonb,
  verification_status text DEFAULT 'none' CHECK (verification_status IN ('none','pending','verified','rejected')),
  verification_docs jsonb, verification_rejection_reason text,
  rating numeric(3,2) DEFAULT 0, followers_count integer DEFAULT 0, ads_count integer DEFAULT 0,
  plan_type text DEFAULT 'free' CHECK (plan_type IN ('free','pro','max')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses(slug);
CREATE INDEX IF NOT EXISTS idx_businesses_owner ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_city_state ON public.businesses(city, state);
CREATE INDEX IF NOT EXISTS idx_businesses_type ON public.businesses(type);

-- 2. business_members
CREATE TABLE IF NOT EXISTS public.business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'viewer' CHECK (role IN ('owner','admin','manager','sales','agent','viewer')),
  invited_by uuid REFERENCES auth.users(id),
  status text DEFAULT 'active' CHECK (status IN ('active','invited','removed')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (business_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_bm_user ON public.business_members(user_id);
CREATE INDEX IF NOT EXISTS idx_bm_business ON public.business_members(business_id);

-- 3. business_followers
CREATE TABLE IF NOT EXISTS public.business_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (business_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_bf_user ON public.business_followers(user_id);
CREATE INDEX IF NOT EXISTS idx_bf_business ON public.business_followers(business_id);

-- 4. Triggers
SELECT create_trigger_if_missing('public','businesses','trg_businesses_updated_at',
  'CREATE TRIGGER trg_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()');
SELECT create_trigger_if_missing('public','business_members','trg_bm_updated_at',
  'CREATE TRIGGER trg_bm_updated_at BEFORE UPDATE ON public.business_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()');

-- 5. RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_followers ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies — businesses
SELECT create_policy_if_missing('public','businesses','Public read active',
  $$CREATE POLICY "Public read active" ON public.businesses FOR SELECT USING (is_active = true OR owner_id = auth.uid())$$);
SELECT create_policy_if_missing('public','businesses','Owner manage',
  $$CREATE POLICY "Owner manage" ON public.businesses FOR ALL USING (owner_id = auth.uid())$$);
SELECT create_policy_if_missing('public','businesses','Admin manage',
  $$CREATE POLICY "Admin manage" ON public.businesses FOR ALL USING (is_admin())$$);

-- 7. RLS policies — business_members
SELECT create_policy_if_missing('public','business_members','Members view',
  $$CREATE POLICY "Members view" ON public.business_members FOR SELECT USING (EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id = business_members.business_id AND bm.user_id = auth.uid() AND bm.status = 'active'))$$);
SELECT create_policy_if_missing('public','business_members','Owner manage members',
  $$CREATE POLICY "Owner manage members" ON public.business_members FOR ALL USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_members.business_id AND b.owner_id = auth.uid()))$$);
SELECT create_policy_if_missing('public','business_members','Admin manage members',
  $$CREATE POLICY "Admin manage members" ON public.business_members FOR ALL USING (is_admin())$$);

-- 8. RLS policies — business_followers
SELECT create_policy_if_missing('public','business_followers','Owner view followers',
  $$CREATE POLICY "Owner view followers" ON public.business_followers FOR SELECT USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_followers.business_id AND b.owner_id = auth.uid()))$$);
SELECT create_policy_if_missing('public','business_followers','User view follows',
  $$CREATE POLICY "User view follows" ON public.business_followers FOR SELECT USING (user_id = auth.uid())$$);
SELECT create_policy_if_missing('public','business_followers','User follow',
  $$CREATE POLICY "User follow" ON public.business_followers FOR INSERT WITH CHECK (user_id = auth.uid())$$);
SELECT create_policy_if_missing('public','business_followers','User unfollow',
  $$CREATE POLICY "User unfollow" ON public.business_followers FOR DELETE USING (user_id = auth.uid())$$);

-- 9. RPC: create_business
CREATE OR REPLACE FUNCTION public.create_business(
  p_name text, p_type text DEFAULT 'generic', p_description text DEFAULT NULL,
  p_phone text DEFAULT NULL, p_whatsapp text DEFAULT NULL, p_email text DEFAULT NULL,
  p_city text DEFAULT NULL, p_state text DEFAULT NULL, p_neighborhood text DEFAULT NULL
) RETURNS public.businesses LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_slug_base text;
  v_slug text;
  v_counter int := 0;
  v_business public.businesses;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = v_user_id AND is_active = true) THEN
    RAISE EXCEPTION 'Você já possui uma empresa cadastrada.';
  END IF;
  v_slug_base := lower(regexp_replace(p_name, '[^a-zA-Z0-9 ]', '', 'g'));
  v_slug_base := regexp_replace(v_slug_base, ' +', '-', 'g');
  v_slug_base := trim(both '-' from v_slug_base);
  IF length(v_slug_base) < 2 THEN v_slug_base := 'empresa'; END IF;
  v_slug := v_slug_base;
  WHILE EXISTS (SELECT 1 FROM public.businesses WHERE slug = v_slug) LOOP
    v_counter := v_counter + 1;
    v_slug := v_slug_base || '-' || v_counter;
  END LOOP;
  INSERT INTO public.businesses (owner_id, name, slug, type, description, phone, whatsapp, email, city, state, neighborhood)
  VALUES (v_user_id, p_name, v_slug, p_type, p_description, p_phone, p_whatsapp, p_email, p_city, p_state, p_neighborhood)
  RETURNING * INTO v_business;
  INSERT INTO public.business_members (business_id, user_id, role, invited_by)
  VALUES (v_business.id, v_user_id, 'owner', v_user_id);
  RETURN v_business;
END;
$$;

-- 10. RPC: follow_business / unfollow_business
CREATE OR REPLACE FUNCTION public.follow_business(p_business_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inserted int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  INSERT INTO public.business_followers (business_id, user_id) VALUES (p_business_id, auth.uid())
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted > 0 THEN
    UPDATE public.businesses SET followers_count = followers_count + 1 WHERE id = p_business_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.unfollow_business(p_business_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.business_followers WHERE business_id = p_business_id AND user_id = auth.uid();
  UPDATE public.businesses SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = p_business_id;
END;
$$;

-- 11. RPC: is_business_owner
CREATE OR REPLACE FUNCTION public.is_business_owner(p_business_id uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.businesses WHERE id = p_business_id AND owner_id = auth.uid());
$$;

-- 12. RPC: get_business_by_slug
CREATE OR REPLACE FUNCTION public.get_business_by_slug(p_slug text) RETURNS public.businesses
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT * FROM public.businesses WHERE slug = p_slug AND is_active = true LIMIT 1;
$$;

-- 13. Link ads to businesses
DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_ads_business ON public.ads(business_id) WHERE business_id IS NOT NULL;
