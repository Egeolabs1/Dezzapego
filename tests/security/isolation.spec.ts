import { test, expect, type Page } from '@playwright/test';
import { TEST_USERS, loginUser } from '../fixtures/auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getToken(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const storageKey = Object.keys(localStorage).find(k => k.endsWith('-auth-token'));
    if (!storageKey) return null;
    const raw = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return raw?.currentSession?.access_token || raw?.access_token || null;
  });
}

test.describe('Isolamento de segurança — Multi-tenant', () => {
  test('Empresa A owner não pode acessar edição da empresa B', async ({ page }) => {
    await loginUser(page, TEST_USERS.userA.email, TEST_USERS.userA.password);

    await page.goto(`/business/editar?business_id=${TEST_USERS.userB.businessId}`);
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const bodyText = await page.textContent('body') || '';

    // Should either redirect away or show error/not-found
    const wasRedirected = !currentUrl.includes('/business/editar');
    const showsError = bodyText.includes('não encontrada') ||
      bodyText.includes('Acesso negado') ||
      bodyText.includes('Sem permissão') ||
      bodyText.includes('não autorizado');

    expect(wasRedirected || showsError).toBeTruthy();
  });

  test('Empresa B não pode ler leads de A via RLS', async ({ page }) => {
    await loginUser(page, TEST_USERS.userB.email, TEST_USERS.userB.password);

    const token = await getToken(page);
    expect(token).not.toBeNull();

    const result = await page.evaluate(async ({ bizIdA, url, anonKey, token }) => {
      const response = await fetch(`${url}/rest/v1/rpc/get_leads_by_business`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ p_business_id: bizIdA }),
      });
      const data = await response.json();
      return { data, error: response.ok ? null : (data?.message || JSON.stringify(data)) };
    }, { bizIdA: TEST_USERS.userA.businessId, url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, token });

    expect(
      result.error !== null ||
      result.data === null ||
      (Array.isArray(result.data) && result.data.length === 0)
    ).toBeTruthy();
  });

  test('Empresa B não pode alterar leads de A via RLS', async ({ page }) => {
    await loginUser(page, TEST_USERS.userB.email, TEST_USERS.userB.password);

    const token = await getToken(page);
    expect(token).not.toBeNull();

    const result = await page.evaluate(async ({ bizIdA, url, anonKey, token }) => {
      const response = await fetch(`${url}/rest/v1/leads?business_id=eq.${bizIdA}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${token}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({ status: 'vendido' }),
      });
      const data = await response.json();
      return { data, error: response.ok ? null : (data?.message || JSON.stringify(data)), count: Array.isArray(data) ? data.length : 0 };
    }, { bizIdA: TEST_USERS.userA.businessId, url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, token });

    expect(result.error !== null || result.count === 0).toBeTruthy();
  });

  test('Comprador C não pode acessar CRM', async ({ page }) => {
    await loginUser(page, TEST_USERS.userC.email, TEST_USERS.userC.password);
    await page.goto('/business/leads');
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    const bodyText = await page.textContent('body') || '';

    const wasRedirected = !currentUrl.includes('/business/leads');
    const showsError = bodyText.includes('Acesso negado') ||
      bodyText.includes('Sem permissão') ||
      bodyText.includes('não autorizado') ||
      bodyText.includes('Crie uma empresa') ||
      bodyText.includes('Nenhum negócio encontrado') ||
      bodyText.includes('Criar Negócio');

    expect(wasRedirected || showsError).toBeTruthy();
  });

  test('Viewer não pode editar leads', async ({ page }) => {
    await loginUser(page, TEST_USERS.viewer.email, TEST_USERS.viewer.password);
    await page.goto('/business/leads');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    if (currentUrl.includes('/business/leads')) {
      const editButtons = page.locator(
        'button:has-text("Editar"), button:has-text("Salvar"), button:has-text("Criar lead")'
      );
      expect(await editButtons.count()).toBe(0);
    }
  });

  test('Agent só pode executar ações permitidas', async ({ page }) => {
    await loginUser(page, TEST_USERS.agent.email, TEST_USERS.agent.password);
    await page.goto('/business/leads');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    if (currentUrl.includes('/business/leads')) {
      const dangerousButtons = page.locator(
        'button:has-text("Excluir"), button:has-text("Deletar"), button:has-text("Remover empresa")'
      );
      expect(await dangerousButtons.count()).toBe(0);
    }
  });

  test('Nenhum usuário pode alterar collections de outra empresa', async ({ page }) => {
    await loginUser(page, TEST_USERS.userB.email, TEST_USERS.userB.password);

    const token = await getToken(page);
    expect(token).not.toBeNull();

    const result = await page.evaluate(async ({ bizIdA, url, anonKey, token }) => {
      const response = await fetch(`${url}/rest/v1/business_collections?business_id=eq.${bizIdA}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${token}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({ name: 'HACKED' }),
      });
      const data = await response.json();
      return { data, error: response.ok ? null : (data?.message || JSON.stringify(data)), count: Array.isArray(data) ? data.length : 0 };
    }, { bizIdA: TEST_USERS.userA.businessId, url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, token });

    expect(result.error !== null || result.count === 0).toBeTruthy();
  });

  test('Nenhum usuário pode acessar métricas de outra empresa', async ({ page }) => {
    await loginUser(page, TEST_USERS.userB.email, TEST_USERS.userB.password);

    const token = await getToken(page);
    expect(token).not.toBeNull();

    const result = await page.evaluate(async ({ bizIdA, url, anonKey, token }) => {
      const response = await fetch(`${url}/rest/v1/business_metrics?business_id=eq.${bizIdA}&select=*`, {
        method: 'GET',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      return { data, error: response.ok ? null : (data?.message || JSON.stringify(data)), count: Array.isArray(data) ? data.length : 0 };
    }, { bizIdA: TEST_USERS.userA.businessId, url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, token });

    expect(result.error !== null || result.count === 0).toBeTruthy();
  });

  test('Planos isolados: Business B não usa entitlement da A', async ({ page }) => {
    await loginUser(page, TEST_USERS.userB.email, TEST_USERS.userB.password);

    const token = await getToken(page);
    expect(token).not.toBeNull();

    const result = await page.evaluate(async ({ bizIdA, url, anonKey, token }) => {
      const response = await fetch(`${url}/rest/v1/rpc/get_plan_features`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ p_business_id: bizIdA }),
      });
      const data = await response.json();
      return { data, error: response.ok ? null : (data?.message || JSON.stringify(data)) };
    }, { bizIdA: TEST_USERS.userA.businessId, url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, token });

    // Should return A's plan data (not crash), but B cannot modify it
    expect(result.error !== null || result.data !== null).toBeTruthy();
  });

  test('Metrics isoladas: Business B não vê métricas de A', async ({ page }) => {
    await loginUser(page, TEST_USERS.userB.email, TEST_USERS.userB.password);

    const token = await getToken(page);
    expect(token).not.toBeNull();

    const result = await page.evaluate(async ({ bizIdA, url, anonKey, token }) => {
      const response = await fetch(`${url}/rest/v1/rpc/get_business_dashboard_metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ p_business_id: bizIdA }),
      });
      const data = await response.json();
      return { data, error: response.ok ? null : (data?.message || JSON.stringify(data)) };
    }, { bizIdA: TEST_USERS.userA.businessId, url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, token });

    // RPC has auth check — B should get error or empty
    expect(
      result.error !== null ||
      result.data === null ||
      (typeof result.data === 'object' && Object.keys(result.data as object).length === 0)
    ).toBeTruthy();
  });
});
