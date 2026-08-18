-- =============================================================================
-- FASE 6 — SEO, URLs POR LOCALIZAÇÃO, STRUCTURED DATA
-- Tabela: seo_location_pages (páginas SEO por localização)
-- RPC: get_seo_location_page, get_seo_sitemap_entries
-- =============================================================================

-- =============================================================================
-- 1. Tabela seo_location_pages — páginas SEO por localização
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.seo_location_pages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug_type         text NOT NULL CHECK (slug_type IN (
    'carros', 'imoveis', 'imobiliarias', 'lojas-de-carros',
    'celulares', 'eletronicos', 'moveis', 'roupas', 'outros'
  )),
  estado            text NOT NULL,
  cidade            text,
  bairro            text,
  marca             text,
  modelo            text,

  -- SEO metadata
  title             text NOT NULL,
  description       text NOT NULL,
  h1                text,
  canonical_path    text NOT NULL,

  -- conteúdo da página
  intro_text        text,
  is_active         boolean DEFAULT true,

  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE public.seo_location_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seo_location_public_read"
  ON public.seo_location_pages FOR SELECT
  USING (is_active = true);

CREATE POLICY "seo_location_admin_all"
  ON public.seo_location_pages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_seo_location_canonical ON public.seo_location_pages(canonical_path);
CREATE INDEX IF NOT EXISTS idx_seo_location_type ON public.seo_location_pages(slug_type);
CREATE INDEX IF NOT EXISTS idx_seo_location_estado ON public.seo_location_pages(estado);
CREATE INDEX IF NOT EXISTS idx_seo_location_cidade ON public.seo_location_pages(cidade);

COMMENT ON TABLE public.seo_location_pages IS 'Páginas SEO estáticas por localização — URLs amigáveis para buscas';

-- =============================================================================
-- 2. RPC: get_seo_location_page — buscar página SEO por path
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_seo_location_page(p_path text)
RETURNS public.seo_location_pages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_page public.seo_location_pages;
BEGIN
  SELECT * INTO v_page
  FROM public.seo_location_pages
  WHERE canonical_path = p_path AND is_active = true;

  RETURN v_page;
END;
$$;

COMMENT ON FUNCTION public.get_seo_location_page IS 'Busca uma página SEO de localização pelo path canônico';

-- =============================================================================
-- 3. RPC: get_seo_sitemap_entries — gerar entradas do sitemap
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_seo_sitemap_entries()
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'path', slp.canonical_path,
    'title', slp.title,
    'updated_at', slp.updated_at
  )
  FROM public.seo_location_pages slp
  WHERE slp.is_active = true
  ORDER BY slp.updated_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_seo_sitemap_entries IS 'Retorna todas as páginas SEO ativas para o sitemap';

-- =============================================================================
-- 4. Trigger updated_at
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_seo_location_updated_at') THEN
    CREATE TRIGGER trigger_seo_location_updated_at
      BEFORE UPDATE ON public.seo_location_pages
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- FIM DA FASE 6
-- =============================================================================
