-- =============================================================================
-- FASE 5 — GEOLOCATION / LOCAL-FIRST
-- Funções de busca por proximidade, empresas próximas, anúncios por local
-- =============================================================================

-- =============================================================================
-- 1. Função auxiliar: cálculo Haversine (distância em km)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.haversine_km(
  lat1 double precision, lon1 double precision,
  lat2 double precision, lon2 double precision
) RETURNS double precision
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  R double precision := 6371;
  dlat double precision;
  dlon double precision;
  a double precision;
  c double precision;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  a := sin(dlat / 2) ^ 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ^ 2;
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  RETURN R * c;
END;
$$;

-- =============================================================================
-- 2. RPC: get_nearby_businesses — empresas próximas
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_nearby_businesses(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision DEFAULT 50,
  p_business_type text DEFAULT NULL,
  p_limit integer DEFAULT 20
) RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', b.id,
    'name', b.name,
    'slug', b.slug,
    'type', b.type,
    'logo_url', b.logo_url,
    'cover_url', b.cover_url,
    'cidade', b.cidade,
    'estado', b.estado,
    'rating', b.rating,
    'followers_count', b.followers_count,
    'ads_count', b.ads_count,
    'is_verified', b.is_verified,
    'distance_km', round(public.haversine_km(p_lat, p_lng, b.latitude, b.longitude)::numeric, 1)
  )
  FROM public.businesses b
  WHERE b.latitude IS NOT NULL
    AND b.longitude IS NOT NULL
    AND public.haversine_km(p_lat, p_lng, b.latitude, b.longitude) <= p_radius_km
    AND (p_business_type IS NULL OR b.type = p_business_type)
  ORDER BY public.haversine_km(p_lat, p_lng, b.latitude, b.longitude)
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_nearby_businesses IS 'Busca empresas dentro de um raio em km a partir de uma coordenada';

-- =============================================================================
-- 3. RPC: search_ads_by_location — anúncios por localização
-- =============================================================================

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
    'cidade', a.cidade,
    'estado', a.estado,
    'bairro', a.bairro,
    'status', a.status,
    'views_count', a.views_count,
    'created_at', a.created_at,
    'distance_km', CASE
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
      THEN round(public.haversine_km(p_lat, p_lng, a.latitude, a.longitude)::numeric, 1)
      ELSE NULL
    END
  )
  FROM public.ads a
  WHERE a.status = 'active'
    AND (p_cidade IS NULL OR a.cidade ILIKE '%' || p_cidade || '%')
    AND (p_estado IS NULL OR a.estado ILIKE p_estado)
    AND (p_category IS NULL OR a.category = p_category)
    AND (p_search IS NULL OR a.title ILIKE '%' || p_search || '%')
    AND (
      p_lat IS NULL OR p_lng IS NULL OR a.latitude IS NULL OR a.longitude IS NULL
      OR public.haversine_km(p_lat, p_lng, a.latitude, a.longitude) <= p_radius_km
    )
  ORDER BY
    CASE WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND a.latitude IS NOT NULL
      THEN public.haversine_km(p_lat, p_lng, a.latitude, a.longitude)
      ELSE 999999
    END
  LIMIT p_limit OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.search_ads_by_location IS 'Busca anúncios com filtros de localização e raio';

-- =============================================================================
-- 4. RPC: get_location_suggestions — sugestões de local
-- =============================================================================

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
    'cidade', a.cidade,
    'estado', a.estado
  )
  FROM public.ads a
  WHERE a.cidade IS NOT NULL
    AND (
      a.cidade ILIKE '%' || p_query || '%'
      OR a.estado ILIKE '%' || p_query || '%'
    )
  ORDER BY a.cidade
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_location_suggestions IS 'Sugere cidades/estados baseado em texto digitado';

-- =============================================================================
-- FIM DA FASE 5
-- =============================================================================
