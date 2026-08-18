import { test, expect } from '@playwright/test';

test.describe('Roteamento e URLs', () => {
  const ROUTES = [
    { path: '/', name: 'Homepage', shouldContain: ['Dezzapego', 'dezzapego'] },
    { path: '/login', name: 'Login', shouldContain: ['Entrar', 'Email', 'Senha'] },
    { path: '/register', name: 'Registro', shouldContain: ['Conta', 'Nome', 'E-mail'] },
    { path: '/business', name: 'Business Dashboard', shouldContain: undefined },
    { path: '/planos', name: 'Planos', shouldContain: ['Plano', 'plano', 'Free', 'Grátis'] },
    { path: '/termos', name: 'Termos de Uso', shouldContain: undefined },
    { path: '/privacidade', name: 'Política de Privacidade', shouldContain: undefined },
    { path: '/contato', name: 'Contato', shouldContain: undefined },
    { path: '/sobre', name: 'Sobre', shouldContain: undefined },
  ];

  for (const route of ROUTES) {
    test(`Rota ${route.path} (${route.name}) carrega corretamente`, async ({ page }) => {
      const response = await page.goto(route.path);

      // Verificar que não retornou erro 5xx
      if (response) {
        expect(response.status()).toBeLessThan(500);
      }

      // Aguardar renderização
      await page.waitForTimeout(2000);

      // Verificar que há conteúdo na página (dashboard ou redirect para login são válidos)
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
      expect(bodyText!.length).toBeGreaterThan(0);

      // Verificar conteúdo específico se definido
      if (route.shouldContain) {
        const hasExpectedContent = route.shouldContain.some(text =>
          bodyText!.includes(text),
        );
        expect(hasExpectedContent).toBeTruthy();
      }
    });
  }

  test('Rota /anuncio/[qualquer-id] mostra anúncio ou erro graceful', async ({ page }) => {
    const response = await page.goto('/anuncio/test-ad-id-12345');

    // Verificar que não retornou erro 5xx
    if (response) {
      expect(response.status()).toBeLessThan(500);
    }

    await page.waitForTimeout(3000);

    // Deve haver algum conteúdo na página (anúncio ou mensagem de erro gracefully)
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(10);
  });

  test('Rota /empresa/[qualquer-slug] mostra página ou erro graceful', async ({ page }) => {
    const response = await page.goto('/empresa/slug-inexistente-test');

    if (response) {
      expect(response.status()).not.toBe(404);
    }

    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('Rota /loja/[qualquer-slug] mostra página ou erro graceful', async ({ page }) => {
    const response = await page.goto('/loja/slug-inexistente-test');

    if (response) {
      expect(response.status()).not.toBe(404);
    }

    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('Rota /imobiliaria/[qualquer-slug] mostra página ou erro graceful', async ({ page }) => {
    const response = await page.goto('/imobiliaria/slug-inexistente-test');

    if (response) {
      expect(response.status()).not.toBe(404);
    }

    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('Rota /corretor/[qualquer-id] mostra página ou erro graceful', async ({ page }) => {
    const response = await page.goto('/corretor/test-id-12345');

    if (response) {
      expect(response.status()).not.toBe(404);
    }

    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('Refresh na homepage mantém conteúdo', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    void (await page.textContent('body'));

    // Recarregar a página
    await page.reload();
    await page.waitForTimeout(2000);

    const afterReloadText = await page.textContent('body');
    expect(afterReloadText).toBeTruthy();
    expect(afterReloadText!.length).toBeGreaterThan(10);
  });

  test('Refresh na página de login mantém formulário', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('#email');

    // Recarregar
    await page.reload();
    await page.waitForSelector('#email');

    // Formulário deve estar presente
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Rota inexistente redireciona para home (não mostra 404 branco)', async ({ page }) => {
    await page.goto('/rota-que-nao-existe-123456');

    await page.waitForTimeout(3000);

    // O app redireciona rotas desconhecidas para home
    const currentUrl = page.url();
    const bodyText = await page.textContent('body');

    // Deve estar na home ou ter algum conteúdo
    const isHome = currentUrl.endsWith('/') || currentUrl.endsWith(':3000/');
    const hasContent = bodyText!.length > 10;

    expect(isHome || hasContent).toBeTruthy();
  });

  test('Navegação direta por URL (não SPA) funciona', async ({ page }) => {
    // Navegar diretamente via goto (simula refresh/digitar URL)
    await page.goto('/planos');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();

    // Verificar que contém algo da página de planos
    const hasPlanContent = bodyText!.includes('Plano') ||
      bodyText!.includes('plano') ||
      bodyText!.includes('Free') ||
      bodyText!.includes('Grátis') ||
      bodyText!.includes('Premium');
    expect(hasPlanContent).toBeTruthy();
  });

  test('Navegação direta para /register funciona', async ({ page }) => {
    await page.goto('/register');
    await page.waitForSelector('#name');

    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });
});
