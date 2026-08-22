import { test, expect } from '@playwright/test';

test.describe('SEO Metadata and Structured Data', () => {
  test('Home page possui título otimizado e JSON-LD WebSite', async ({ request }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);
    const html = await response.text();

    expect(html).toContain('Dezzapego | Compre e Venda Grátis no Brasil');
    expect(html).toMatch(/<meta[^>]*name="description"[^>]*content="[^"]*Dezzapego/i);
    expect(html).toContain('application/ld+json');
    expect(html).toContain('"@type":"WebSite"');
    expect(html).toContain('SearchAction');
  });

  test('Página de Dicas de Segurança possui FAQPage JSON-LD e título próprio', async ({ request }) => {
    const response = await request.get('/dicas-seguranca');
    expect(response.status()).toBe(200);
    const html = await response.text();

    expect(html).toContain('Dicas de Segurança');
    expect(html).toContain('FAQPage');
    expect(html).toContain('Como comprar com segurança no Dezzapego?');
  });

  test('Página de Planos possui FAQPage JSON-LD e título próprio', async ({ request }) => {
    const response = await request.get('/planos');
    expect(response.status()).toBe(200);
    const html = await response.text();

    expect(html).toContain('Planos e Destaques');
    expect(html).toContain('FAQPage');
    expect(html).toContain('vantagens dos planos profissionais');
  });

  test('Página de Sobre possui título próprio e descrição institucional', async ({ request }) => {
    const response = await request.get('/sobre');
    expect(response.status()).toBe(200);
    const html = await response.text();

    expect(html).toContain('Sobre o Dezzapego');
    expect(html).toContain('FAQPage');
  });

  test('Página de Categoria possui CollectionPage e BreadcrumbList', async ({ request }) => {
    const response = await request.get('/categoria/imoveis');
    expect(response.status()).toBe(200);
    const html = await response.text();

    expect(html).toContain('Imóveis');
    expect(html).toContain('CollectionPage');
    expect(html).toContain('BreadcrumbList');
  });

  test('Página de Cidade possui schema Place e Breadcrumbs', async ({ request }) => {
    const response = await request.get('/cidade/sp/campinas');
    expect(response.status()).toBe(200);
    const html = await response.text();

    expect(html).toContain('Campinas');
    expect(html).toContain('Place');
  });

  test('Robots.txt possui diretivas de desautorização para áreas restritas', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const text = await response.text();

    expect(text).toContain('User-agent: *');
    expect(text).toContain('Disallow: /admin');
    expect(text).toContain('Disallow: /dashboard');
    expect(text).toContain('Disallow: /meus-anuncios');
    expect(text).toContain('Disallow: /favoritos');
    expect(text).toContain('Disallow: /business/');
    expect(text).toContain('Disallow: /editar/');
    expect(text).toContain('Disallow: /editar-anuncio/');
    expect(text).toContain('Sitemap: https://dezzapego.com/sitemap.xml');
  });

  test('Rotas autenticadas dinâmicas não são indexáveis', async ({ request }) => {
    for (const path of ['/business', '/business/nova', '/editar/anuncio-exemplo', '/editar-anuncio/anuncio-exemplo']) {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      const html = await response.text();
      expect(html).toMatch(/<meta[^>]*name="robots"[^>]*content="noindex, nofollow"/i);
    }
  });
});
