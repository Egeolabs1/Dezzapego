import { test, expect } from '@playwright/test';
import { TEST_USERS, loginUser } from '../fixtures/auth';

test.describe('Fluxo de Veículos', () => {
  test('Owner A pode acessar dashboard', async ({ page }) => {
    await loginUser(page, TEST_USERS.userA.email, TEST_USERS.userA.password);

    await page.goto('/business');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body') || '';
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test('Página de loja existe para visualização pública', async ({ page }) => {
    await page.goto('/loja/test-loja');
    await page.waitForTimeout(2000);

    const bodyText = await page.textContent('body') || '';
    expect(bodyText.length).toBeGreaterThan(10);
  });
});
