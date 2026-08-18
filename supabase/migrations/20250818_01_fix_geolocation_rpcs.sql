-- =============================================================================
-- FIX: search_ads_by_location e get_location_suggestions
-- A tabela ads reais armazena localização em JSONB 'location' e tem lat/lng
-- top-level. As RPCs originais referenciavam colunas que não existem:
--   a.cidade, a.estado, a.bairro, a.latitude, a.longitude
-- Corrigido para extrair do JSONB: a.location->>'city', a.location->>'state',
-- a.location->>'neighborhood', e usar a.lat, a.lng.
-- =============================================================================

-- 1. search_ads_by_location — busca anúncios com filtros de localização e raio
DROP FUNCTION IF EXISTS public.search_ads_by_location(
  double precision, double precision, double precision,
  text, text, text, text, integer, integer
);

CREATE OR REPLACE FUNCTION public.search_ads_by_location(
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL,
  p_radius_km double precision DEFAULT 50,
  p_cidade text DEFAULT NULL,
  p_estado text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 30,
  p_offset integer DEFAULT 0
) RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', a.id,
    'title', a.title,
    'price', a.price,
    'category', a.category,
    'images', a.images,
    'cidade', a.location->>'city',
    'estado', a.location->>'state',
    'bairro', a.location->>'neighborhood',
    'status', a.status,
    'views_count', a.views,
    'created_at', a.created_at,
    'distance_km', CASE
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND a.lat IS NOT NULL AND a.lng IS NOT NULL
      THEN round(public.haversine_km(p_lat, p_lng, a.lat, a.lng)::numeric, 1)
      ELSE NULL
    END
  )
  FROM public.ads a
  WHERE a.status = 'active'
    AND (p_cidade IS NULL OR (a.location->>'city') ILIKE '%' || p_cidade || '%')
    AND (p_estado IS NULL OR (a.location->>'state') ILIKE p_estado)
    AND (p_category IS NULL OR a.category = p_category)
    AND (p_search IS NULL OR a.title ILIKE '%' || p_search || '%')
    AND (
      p_lat IS NULL OR p_lng IS NULL
      OR (a.lat IS NOT NULL AND a.lng IS NOT NULL AND public.haversine_km(p_lat, p_lng, a.lat, a.lng) <= p_radius_km)
    )
  ORDER BY
    CASE WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND a.lat IS NOT NULL
      THEN public.haversine_km(p_lat, p_lng, a.lat, a.lng)
      ELSE 999999
    END
  LIMIT p_limit OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.search_ads_by_location IS 'Busca anúncios com filtros de localização e raio';

-- 2. get_location_suggestions — sugestões de local
DROP FUNCTION IF EXISTS public.get_location_suggestions(text, integer);

CREATE OR REPLACE FUNCTION public.get_location_suggestions(
  p_query text,
  p_limit integer DEFAULT 10
) RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT jsonb_build_object(
    'cidade', a.location->>'city',
    'estado', a.location->>'state'
  )
  FROM public.ads a
  WHERE (a.location->>'city') IS NOT NULL
    AND (
      (a.location->>'city') ILIKE '%' || p_query || '%'
      OR (a.location->>'state') ILIKE '%' || p_query || '%'
    )
  ORDER BY a.location->>'city'
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_location_suggestions IS 'Sugere cidades/estados baseado em texto digitado';
