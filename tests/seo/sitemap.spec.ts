import { test, expect } from '@playwright/test';

test.describe('Sitemap XML', () => {
  test('GET /api/sitemap.xml retorna 200 com XML válido', async ({ request }) => {
    const response = await request.get('/api/sitemap.xml');
    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('xml');

    const xml = await response.text();
    expect(xml).toContain('<?xml');
    expect(xml).toContain('<urlset');
    expect(xml).toContain('</urlset>');
  });

  test('Sitemap contém páginas SEO locais', async ({ request }) => {
    const response = await request.get('/api/sitemap.xml');
    const xml = await response.text();
    // Should contain /cidade/ paths from SEO_LOCATIONS
    expect(xml).toContain('/cidade/');
  });

  test('Sitemap contém categorias', async ({ request }) => {
    const response = await request.get('/api/sitemap.xml');
    const xml = await response.text();
    expect(xml).toContain('/categoria/');
  });

  test('Sitemap contém anúncios', async ({ request }) => {
    const response = await request.get('/api/sitemap.xml');
    const xml = await response.text();
    expect(xml).toContain('/anuncio/');
  });

  test('Sitemap NÃO contém rotas admin/auth', async ({ request }) => {
    const response = await request.get('/api/sitemap.xml');
    const xml = await response.text();
    expect(xml).not.toMatch(/<loc>[^<]*\/login<\/loc>/);
    expect(xml).not.toMatch(/<loc>[^<]*\/register<\/loc>/);
    expect(xml).not.toMatch(/<loc>[^<]*\/admin(?:<|\/)/);
    expect(xml).not.toMatch(/<loc>[^<]*\/redefinir-senha<\/loc>/);
  });

  test('Todas URLs são absolutas com https', async ({ request }) => {
    const response = await request.get('/api/sitemap.xml');
    const xml = await response.text();
    const urls = xml.match(/<loc>([^<]+)<\/loc>/g) || [];
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      const loc = url.replace(/<\/?loc>/g, '');
      expect(loc).toMatch(/^https:\/\//);
    }
  });
});
