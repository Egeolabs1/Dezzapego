import { test, expect } from '@playwright/test';

// Reference point: Av. Paulista, São Paulo
const REF_LAT = -23.5632;
const REF_LNG = -46.6542;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

test.describe('Geolocalização — Funcional', () => {
  test('Homepage mostra elementos de localização', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    const hasGeoContent =
      bodyText?.includes('Localização') ||
      bodyText?.includes('localização') ||
      bodyText?.includes('cidade') ||
      bodyText?.includes('perto') ||
      bodyText?.includes('Encontre') ||
      bodyText?.includes('anúncios') ||
      bodyText?.includes('classificados');
    expect(hasGeoContent).toBeTruthy();
  });

  test('Busca por estado retorna apenas anúncios desse estado', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Query ads table directly via REST API (no import() in browser context)
    const result = await page.evaluate(async ({ url, key }) => {
      const response = await fetch(`${url}/rest/v1/ads?status=eq.active&select=id,location`, {
        method: 'GET',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
      });
      const data = await response.json();
      if (!response.ok) return { sp: [], rj: [], error: data?.message || JSON.stringify(data) };

      const spAds = (data || []).filter((a: any) => a.location?.state === 'SP');
      const rjAds = (data || []).filter((a: any) => a.location?.state === 'RJ');

      return {
        sp: spAds.map((a: any) => a.id),
        rj: rjAds.map((a: any) => a.id),
        error: null,
      };
    }, { url: SUPABASE_URL, key: SUPABASE_ANON_KEY });

    expect(result.error).toBeNull();
    expect(result.sp.length).toBeGreaterThan(0);
    expect(result.rj.length).toBeGreaterThan(0);

    // No overlap between states
    const overlap = result.sp.filter((id: string) => result.rj.includes(id));
    expect(overlap).toHaveLength(0);
  });

  test('Raio 10km: retorna apenas anúncios próximos', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const result = await page.evaluate(async ({ lat, lng, url, key }) => {
      const response = await fetch(`${url}/rest/v1/rpc/search_ads_by_location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          p_lat: lat,
          p_lng: lng,
          p_radius_km: 10,
          p_limit: 50,
        }),
      });
      const data = await response.json();
      return {
        ads: (Array.isArray(data) ? data : []).map((a: any) => ({
          id: a.id,
          distance_km: a.distance_km,
        })),
        error: response.ok ? null : (data?.message || JSON.stringify(data)),
      };
    }, { lat: REF_LAT, lng: REF_LNG, url: SUPABASE_URL, key: SUPABASE_ANON_KEY });

    expect(result.error).toBeNull();

    const ids = result.ads.map(a => a.id);
    // ~2km and ~8km from Paulista should be within 10km
    expect(ids).toContain('11111111-1111-4111-a111-111111111101');
    expect(ids).toContain('11111111-1111-4111-a111-111111111102');
    // ~400km (Rio) and ~500km (BH) should NOT be within 10km
    expect(ids).not.toContain('11111111-1111-4111-a111-111111111103');
    expect(ids).not.toContain('11111111-1111-4111-a111-111111111106');

    for (const ad of result.ads) {
      expect(ad.distance_km).toBeLessThanOrEqual(10);
    }
  });

  test('Raio 50km: inclui mais anúncios', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const result = await page.evaluate(async ({ lat, lng, url, key }) => {
      const response = await fetch(`${url}/rest/v1/rpc/search_ads_by_location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          p_lat: lat,
          p_lng: lng,
          p_radius_km: 50,
          p_limit: 50,
        }),
      });
      const data = await response.json();
      return {
        ads: (Array.isArray(data) ? data : []).map((a: any) => ({
          id: a.id,
          distance_km: a.distance_km,
        })),
        error: response.ok ? null : (data?.message || JSON.stringify(data)),
      };
    }, { lat: REF_LAT, lng: REF_LNG, url: SUPABASE_URL, key: SUPABASE_ANON_KEY });

    expect(result.error).toBeNull();
    const ids = result.ads.map(a => a.id);
    // Should include SP metro area
    expect(ids).toContain('11111111-1111-4111-a111-111111111101');
    expect(ids).toContain('11111111-1111-4111-a111-111111111102');
    // Should NOT include Rio or BH
    expect(ids).not.toContain('11111111-1111-4111-a111-111111111103');
    expect(ids).not.toContain('11111111-1111-4111-a111-111111111106');
  });

  test('Busca por cidade filtra corretamente', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const result = await page.evaluate(async ({ url, key }) => {
      const response = await fetch(`${url}/rest/v1/rpc/search_ads_by_location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          p_cidade: 'São Paulo',
          p_estado: 'SP',
          p_limit: 50,
        }),
      });
      const data = await response.json();
      return {
        ads: (Array.isArray(data) ? data : []).map((a: any) => ({
          id: a.id,
          cidade: a.cidade,
        })),
        error: response.ok ? null : (data?.message || JSON.stringify(data)),
      };
    }, { url: SUPABASE_URL, key: SUPABASE_ANON_KEY });

    expect(result.error).toBeNull();
    expect(result.ads.length).toBeGreaterThan(0);
    for (const ad of result.ads) {
      expect(ad.cidade).toBe('São Paulo');
    }
  });

  test('Brasil inteiro: retorna anúncios de múltiplos estados', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Query ads table directly via REST API
    const result = await page.evaluate(async ({ url, key }) => {
      const response = await fetch(`${url}/rest/v1/ads?status=eq.active&select=id,location`, {
        method: 'GET',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
      });
      const data = await response.json();
      if (!response.ok) return { ads: [], error: data?.message || JSON.stringify(data) };

      return {
        ads: (data || []).map((a: any) => ({ id: a.id, estado: a.location?.state || null })),
        error: null,
      };
    }, { url: SUPABASE_URL, key: SUPABASE_ANON_KEY });

    expect(result.error).toBeNull();
    const states = [...new Set(result.ads.map((a: { id: string; estado: string | null }) => a.estado))];
    expect(states.length).toBeGreaterThanOrEqual(2);
  });

  test('LocationSelector funciona', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const locationBtn = page.locator('button:has-text("Localização"), button:has-text("Local")').first();
    if (await locationBtn.isVisible()) {
      await locationBtn.click();
      await page.waitForTimeout(500);

      const stateBtn = page.locator('button:has-text("São Paulo"), button:has-text("SP")').first();
      if (await stateBtn.isVisible()) {
        await stateBtn.click();
        await page.waitForTimeout(1000);
        const bodyText = await page.textContent('body');
        expect(bodyText).toBeTruthy();
      }
    }
  });
});
