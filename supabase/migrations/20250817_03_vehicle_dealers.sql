-- =============================================================================
-- FASE 3 — LOJAS DE VEÍCULOS
-- Business type: vehicle_dealer
-- Tabelas: business_vehicle_dealer, vehicle_listings, test_drives,
--          trade_ins, vehicle_collections
-- RPCs: create/update vehicle, schedule test drive, trade-in, financing sim
-- =============================================================================

-- Função auxiliar para updated_at (se não existir)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. Tabela business_vehicle_dealer — especialização de vehicle_dealer
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_vehicle_dealer (
  business_id        uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  cnpj               text,
  brands_worked      text[] DEFAULT '{}',
  has_financing      boolean DEFAULT false,
  accepts_trade      boolean DEFAULT false,
  has_delivery       boolean DEFAULT false,
  delivery_reach     text DEFAULT 'LOCAL' CHECK (delivery_reach IN ('LOCAL','REGIONAL','ESTADUAL','NACIONAL')),
  business_hours     text,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

ALTER TABLE public.business_vehicle_dealer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicle_dealer_owner_all"
  ON public.business_vehicle_dealer FOR ALL
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

CREATE POLICY "vehicle_dealer_public_read"
  ON public.business_vehicle_dealer FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_vehicle_dealer_business ON public.business_vehicle_dealer(business_id);

COMMENT ON TABLE public.business_vehicle_dealer IS 'Especialização de businesses do tipo vehicle_dealer — lojas de veículos';

-- =============================================================================
-- 2. Tabela vehicle_listings — anúncios de veículos
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_listings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_id             uuid REFERENCES public.ads(id) ON DELETE SET NULL,

  -- dados do veículo
  brand             text NOT NULL,
  model             text NOT NULL,
  version           text,
  year_fabrication  integer NOT NULL,
  year_model        integer NOT NULL,
  price             numeric(12,2) NOT NULL,
  mileage           integer,
  transmission      text CHECK (transmission IN ('manual','automatic','automated','cvt')),
  fuel              text CHECK (fuel IN ('gasoline','ethanol','diesel','flex','electric','hybrid')),
  body_type         text CHECK (body_type IN ('sedan','hatch','suv','pickup','utility','motorcycle','van','other')),
  color             text,
  doors             integer,
  horsepower        integer,
  plate_last_digit  text,
  is_unique_owner   boolean DEFAULT false,
  is_armored        boolean DEFAULT false,
  has_warranty      boolean DEFAULT false,
  accepts_trade     boolean DEFAULT false,
  has_financing     boolean DEFAULT false,

  -- equipamentos (JSON array de strings)
  equipment         jsonb DEFAULT '[]'::jsonb,

  -- alcance e entrega
  reach             text DEFAULT 'LOCAL' CHECK (reach IN ('LOCAL','REGIONAL','ESTADUAL','NACIONAL')),
  delivery_options  text[] DEFAULT '{}',

  -- imagens
  images            text[] DEFAULT '{}',

  -- status e métricas
  status            text DEFAULT 'active' CHECK (status IN ('active','sold','reserved','paused')),
  views_count       integer DEFAULT 0,
  favorites_count   integer DEFAULT 0,

  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE public.vehicle_listings ENABLE ROW LEVEL SECURITY;

-- RLS: owner e membros podem editar
CREATE POLICY "vehicle_listing_owner_all"
  ON public.vehicle_listings FOR ALL
  USING (
    user_id = auth.uid()
    OR business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- RLS: público pode ler veículos ativos
CREATE POLICY "vehicle_listing_public_read"
  ON public.vehicle_listings FOR SELECT
  USING (status = 'active' OR user_id = auth.uid()
    OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_business ON public.vehicle_listings(business_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_user ON public.vehicle_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_brand ON public.vehicle_listings(brand);
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_model ON public.vehicle_listings(model);
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_status ON public.vehicle_listings(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_price ON public.vehicle_listings(price);
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_year ON public.vehicle_listings(year_model);
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_body ON public.vehicle_listings(body_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_fuel ON public.vehicle_listings(fuel);
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_transmission ON public.vehicle_listings(transmission);

COMMENT ON TABLE public.vehicle_listings IS 'Anúncios de veículos de lojas cadastradas no Dezzapego';

-- =============================================================================
-- 3. Tabela test_drives — agendamento de test drive
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.test_drives (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id        uuid NOT NULL REFERENCES public.vehicle_listings(id) ON DELETE CASCADE,
  business_id       uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_name        text NOT NULL,
  buyer_phone       text NOT NULL,
  buyer_email       text,
  requested_date    date NOT NULL,
  requested_time    time NOT NULL,
  status            text DEFAULT 'solicitado' CHECK (status IN ('solicitado','confirmado','reagendado','cancelado','concluido')),
  notes             text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE public.test_drives ENABLE ROW LEVEL SECURITY;

-- RLS: comprador vê seus próprios test drives
CREATE POLICY "test_drive_buyer_read"
  ON public.test_drives FOR SELECT
  USING (user_id = auth.uid() OR buyer_phone IN (
    SELECT phone FROM public.profiles WHERE id = auth.uid()
  ));

-- RLS: owner da loja vê e gerencia todos
CREATE POLICY "test_drive_business_owner"
  ON public.test_drives FOR ALL
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

-- RLS: qualquer um autenticado pode criar (formulário público com auth)
CREATE POLICY "test_drive_create_auth"
  ON public.test_drives FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_test_drives_vehicle ON public.test_drives(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_test_drives_business ON public.test_drives(business_id);
CREATE INDEX IF NOT EXISTS idx_test_drives_user ON public.test_drives(user_id);
CREATE INDEX IF NOT EXISTS idx_test_drives_status ON public.test_drives(status);
CREATE INDEX IF NOT EXISTS idx_test_drives_date ON public.test_drives(requested_date);

COMMENT ON TABLE public.test_drives IS 'Agendamentos de test drive para veículos de lojas';

-- =============================================================================
-- 4. Tabela trade_ins — veículos para troca (leads)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.trade_ins (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ad_id             uuid REFERENCES public.ads(id) ON DELETE SET NULL,
  brand             text NOT NULL,
  model             text NOT NULL,
  version           text,
  year              integer NOT NULL,
  mileage           integer,
  expected_value    numeric(12,2),
  images            text[] DEFAULT '{}',
  notes             text,
  status            text DEFAULT 'pending' CHECK (status IN ('pending','contacted','negotiating','accepted','rejected')),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE public.trade_ins ENABLE ROW LEVEL SECURITY;

-- RLS: owner da loja vê todos os trade-ins
CREATE POLICY "trade_in_business_owner"
  ON public.trade_ins FOR ALL
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

-- RLS: usuário vê seus próprios
CREATE POLICY "trade_in_user_read"
  ON public.trade_ins FOR SELECT
  USING (user_id = auth.uid());

-- RLS: qualquer autenticado pode criar
CREATE POLICY "trade_in_create_auth"
  ON public.trade_ins FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_trade_ins_business ON public.trade_ins(business_id);
CREATE INDEX IF NOT EXISTS idx_trade_ins_user ON public.trade_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_ins_status ON public.trade_ins(status);

COMMENT ON TABLE public.trade_ins IS 'Veículos oferecidos em troca — gera lead automático para a loja';

-- =============================================================================
-- 5. Tabela vehicle_collections — coleções/vitrine da loja
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_collections (
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

ALTER TABLE public.vehicle_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collection_owner_all"
  ON public.vehicle_collections FOR ALL
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
  ON public.vehicle_collections FOR SELECT
  USING (is_active = true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_collection_slug_business ON public.vehicle_collections(business_id, slug);
CREATE INDEX IF NOT EXISTS idx_collection_business ON public.vehicle_collections(business_id);

COMMENT ON TABLE public.vehicle_collections IS 'Coleções temáticas da vitrine de uma loja de veículos';

-- =============================================================================
-- 6. Tabela vehicle_collection_items — vinculação veículo ↔ coleção
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_collection_items (
  collection_id     uuid NOT NULL REFERENCES public.vehicle_collections(id) ON DELETE CASCADE,
  vehicle_id        uuid NOT NULL REFERENCES public.vehicle_listings(id) ON DELETE CASCADE,
  sort_order        integer DEFAULT 0,
  PRIMARY KEY (collection_id, vehicle_id)
);

ALTER TABLE public.vehicle_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collection_items_owner"
  ON public.vehicle_collection_items FOR ALL
  USING (
    collection_id IN (
      SELECT id FROM public.vehicle_collections WHERE business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    collection_id IN (
      SELECT id FROM public.vehicle_collections WHERE business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "collection_items_public_read"
  ON public.vehicle_collection_items FOR SELECT
  USING (true);

COMMENT ON TABLE public.vehicle_collection_items IS 'Vinculação de veículos a coleções da vitrine';

-- =============================================================================
-- 7. RPC: create_vehicle_listing
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_vehicle_listing(
  p_business_id uuid,
  p_brand text,
  p_model text,
  p_year_fabrication integer,
  p_year_model integer,
  p_price numeric,
  p_version text DEFAULT NULL,
  p_mileage integer DEFAULT NULL,
  p_transmission text DEFAULT NULL,
  p_fuel text DEFAULT NULL,
  p_body_type text DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_doors integer DEFAULT NULL,
  p_horsepower integer DEFAULT NULL,
  p_plate_last_digit text DEFAULT NULL,
  p_is_unique_owner boolean DEFAULT false,
  p_is_armored boolean DEFAULT false,
  p_has_warranty boolean DEFAULT false,
  p_accepts_trade boolean DEFAULT false,
  p_has_financing boolean DEFAULT false,
  p_equipment jsonb DEFAULT '[]'::jsonb,
  p_reach text DEFAULT 'LOCAL',
  p_delivery_options text[] DEFAULT '{}',
  p_images text[] DEFAULT '{}'
) RETURNS public.vehicle_listings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_vehicle public.vehicle_listings;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = p_business_id AND owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Não é proprietário desta empresa'; END IF;

  INSERT INTO public.vehicle_listings (
    business_id, user_id, brand, model, version,
    year_fabrication, year_model, price, mileage,
    transmission, fuel, body_type, color, doors, horsepower,
    plate_last_digit, is_unique_owner, is_armored, has_warranty,
    accepts_trade, has_financing, equipment, reach, delivery_options, images
  ) VALUES (
    p_business_id, auth.uid(), p_brand, p_model, p_version,
    p_year_fabrication, p_year_model, p_price, p_mileage,
    p_transmission, p_fuel, p_body_type, p_color, p_doors, p_horsepower,
    p_plate_last_digit, p_is_unique_owner, p_is_armored, p_has_warranty,
    p_accepts_trade, p_has_financing, p_equipment, p_reach, p_delivery_options, p_images
  ) RETURNING * INTO v_vehicle;

  -- incrementar contador de anúncios da empresa
  UPDATE public.businesses SET ads_count = ads_count + 1 WHERE id = p_business_id;

  RETURN v_vehicle;
END;
$$;

COMMENT ON FUNCTION public.create_vehicle_listing IS 'Cria um anúncio de veículo para uma loja';

-- =============================================================================
-- 8. RPC: update_vehicle_listing
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_vehicle_listing(
  p_vehicle_id uuid,
  p_brand text DEFAULT NULL,
  p_model text DEFAULT NULL,
  p_version text DEFAULT NULL,
  p_year_fabrication integer DEFAULT NULL,
  p_year_model integer DEFAULT NULL,
  p_price numeric DEFAULT NULL,
  p_mileage integer DEFAULT NULL,
  p_transmission text DEFAULT NULL,
  p_fuel text DEFAULT NULL,
  p_body_type text DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_doors integer DEFAULT NULL,
  p_horsepower integer DEFAULT NULL,
  p_plate_last_digit text DEFAULT NULL,
  p_is_unique_owner boolean DEFAULT NULL,
  p_is_armored boolean DEFAULT NULL,
  p_has_warranty boolean DEFAULT NULL,
  p_accepts_trade boolean DEFAULT NULL,
  p_has_financing boolean DEFAULT NULL,
  p_equipment jsonb DEFAULT NULL,
  p_reach text DEFAULT NULL,
  p_delivery_options text[] DEFAULT NULL,
  p_images text[] DEFAULT NULL,
  p_status text DEFAULT NULL
) RETURNS public.vehicle_listings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_vehicle public.vehicle_listings;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT * INTO v_vehicle FROM public.vehicle_listings WHERE id = p_vehicle_id;
  IF v_vehicle IS NULL THEN RAISE EXCEPTION 'Veículo não encontrado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = v_vehicle.business_id AND owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Não é proprietário desta empresa'; END IF;

  UPDATE public.vehicle_listings SET
    brand = COALESCE(p_brand, brand),
    model = COALESCE(p_model, model),
    version = COALESCE(p_version, version),
    year_fabrication = COALESCE(p_year_fabrication, year_fabrication),
    year_model = COALESCE(p_year_model, year_model),
    price = COALESCE(p_price, price),
    mileage = COALESCE(p_mileage, mileage),
    transmission = COALESCE(p_transmission, transmission),
    fuel = COALESCE(p_fuel, fuel),
    body_type = COALESCE(p_body_type, body_type),
    color = COALESCE(p_color, color),
    doors = COALESCE(p_doors, doors),
    horsepower = COALESCE(p_horsepower, horsepower),
    plate_last_digit = COALESCE(p_plate_last_digit, plate_last_digit),
    is_unique_owner = COALESCE(p_is_unique_owner, is_unique_owner),
    is_armored = COALESCE(p_is_armored, is_armored),
    has_warranty = COALESCE(p_has_warranty, has_warranty),
    accepts_trade = COALESCE(p_accepts_trade, accepts_trade),
    has_financing = COALESCE(p_has_financing, has_financing),
    equipment = COALESCE(p_equipment, equipment),
    reach = COALESCE(p_reach, reach),
    delivery_options = COALESCE(p_delivery_options, delivery_options),
    images = COALESCE(p_images, images),
    status = COALESCE(p_status, status),
    updated_at = now()
  WHERE id = p_vehicle_id
  RETURNING * INTO v_vehicle;

  RETURN v_vehicle;
END;
$$;

COMMENT ON FUNCTION public.update_vehicle_listing IS 'Atualiza um anúncio de veículo';

-- =============================================================================
-- 9. RPC: schedule_test_drive
-- =============================================================================

CREATE OR REPLACE FUNCTION public.schedule_test_drive(
  p_vehicle_id uuid,
  p_buyer_name text,
  p_buyer_phone text,
  p_requested_date date,
  p_requested_time time,
  p_buyer_email text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS public.test_drives
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_drive public.test_drives;
DECLARE v_business_id uuid;
BEGIN
  SELECT business_id INTO v_business_id FROM public.vehicle_listings WHERE id = p_vehicle_id;
  IF v_business_id IS NULL THEN RAISE EXCEPTION 'Veículo não encontrado'; END IF;

  INSERT INTO public.test_drives (
    vehicle_id, business_id, user_id,
    buyer_name, buyer_phone, buyer_email,
    requested_date, requested_time, notes
  ) VALUES (
    p_vehicle_id, v_business_id, auth.uid(),
    p_buyer_name, p_buyer_phone, p_buyer_email,
    p_requested_date, p_requested_time, p_notes
  ) RETURNING * INTO v_drive;

  RETURN v_drive;
END;
$$;

COMMENT ON FUNCTION public.schedule_test_drive IS 'Agenda um test drive para um veículo';

-- =============================================================================
-- 10. RPC: send_trade_in
-- =============================================================================

CREATE OR REPLACE FUNCTION public.send_trade_in(
  p_business_id uuid,
  p_brand text,
  p_model text,
  p_year integer,
  p_version text DEFAULT NULL,
  p_mileage integer DEFAULT NULL,
  p_expected_value numeric DEFAULT NULL,
  p_images text[] DEFAULT '{}',
  p_notes text DEFAULT NULL,
  p_ad_id uuid DEFAULT NULL
) RETURNS public.trade_ins
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_trade public.trade_ins;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  INSERT INTO public.trade_ins (
    business_id, user_id, ad_id,
    brand, model, version, year,
    mileage, expected_value, images, notes
  ) VALUES (
    p_business_id, auth.uid(), p_ad_id,
    p_brand, p_model, p_version, p_year,
    p_mileage, p_expected_value, p_images, p_notes
  ) RETURNING * INTO v_trade;

  RETURN v_trade;
END;
$$;

COMMENT ON FUNCTION public.send_trade_in IS 'Envia um veículo para troca — gera lead para a loja';

-- =============================================================================
-- 11. RPC: simulate_financing (informativo)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.simulate_financing(
  p_vehicle_price numeric,
  p_down_payment numeric,
  p_installments integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_financed numeric;
DECLARE v_monthly numeric;
DECLARE v_total numeric;
BEGIN
  IF p_installments < 1 OR p_installments > 60 THEN
    RAISE EXCEPTION 'Parcelas deve ser entre 1 e 60';
  END IF;
  IF p_down_payment >= p_vehicle_price THEN
    RAISE EXCEPTION 'Entrada não pode ser igual ou superior ao valor do veículo';
  END IF;

  -- taxa estimada simples (1.99% ao mês — puramente informativo)
  v_financed := p_vehicle_price - p_down_payment;
  v_monthly := v_financed * (1 + 0.0199 * p_installments) / p_installments;
  v_total := v_monthly * p_installments;

  RETURN jsonb_build_object(
    'vehicle_price', p_vehicle_price,
    'down_payment', p_down_payment,
    'financed_amount', v_financed,
    'installments', p_installments,
    'estimated_monthly', round(v_monthly, 2),
    'estimated_total', round(v_total, 2),
    'disclaimer', 'Simulação informativa. Valores reais podem variar conforme instituição financeira.'
  );
END;
$$;

COMMENT ON FUNCTION public.simulate_financing IS 'Simulação informativa de financiamento — não é cotação real';

-- =============================================================================
-- 12. RPC: get_vehicle_filters — opções de filtro para uma loja
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_vehicle_filters(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'brands', COALESCE((SELECT jsonb_agg(DISTINCT brand) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active'), '[]'::jsonb),
    'models', COALESCE((SELECT jsonb_agg(DISTINCT model) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active'), '[]'::jsonb),
    'body_types', COALESCE((SELECT jsonb_agg(DISTINCT body_type) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active' AND body_type IS NOT NULL), '[]'::jsonb),
    'fuels', COALESCE((SELECT jsonb_agg(DISTINCT fuel) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active' AND fuel IS NOT NULL), '[]'::jsonb),
    'transmissions', COALESCE((SELECT jsonb_agg(DISTINCT transmission) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active' AND transmission IS NOT NULL), '[]'::jsonb),
    'colors', COALESCE((SELECT jsonb_agg(DISTINCT color) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active' AND color IS NOT NULL), '[]'::jsonb),
    'min_year', (SELECT MIN(year_model) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active'),
    'max_year', (SELECT MAX(year_model) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active'),
    'min_price', (SELECT MIN(price) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active'),
    'max_price', (SELECT MAX(price) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active'),
    'min_mileage', (SELECT MIN(mileage) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active' AND mileage IS NOT NULL),
    'max_mileage', (SELECT MAX(mileage) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active' AND mileage IS NOT NULL)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_vehicle_filters IS 'Retorna opções de filtro disponíveis para o estoque de uma loja';

-- =============================================================================
-- 13. Trigger: updated_at para vehicle_listings
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_vehicle_listings_updated_at') THEN
    CREATE TRIGGER trigger_vehicle_listings_updated_at
      BEFORE UPDATE ON public.vehicle_listings
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_test_drives_updated_at') THEN
    CREATE TRIGGER trigger_test_drives_updated_at
      BEFORE UPDATE ON public.test_drives
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_trade_ins_updated_at') THEN
    CREATE TRIGGER trigger_trade_ins_updated_at
      BEFORE UPDATE ON public.trade_ins
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- FIM DA FASE 3
-- =============================================================================
