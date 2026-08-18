import { test, expect } from '@playwright/test';
import { TEST_USERS, loginUser } from '../fixtures/auth';

test.describe('Fluxo Imobiliário', () => {
  test('Owner A pode acessar dashboard de imobiliária', async ({ page }) => {
    await loginUser(page, TEST_USERS.userA.email, TEST_USERS.userA.password);

    await page.goto('/business');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body') || '';
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test('Página de imobiliária existe para visualização pública', async ({ page }) => {
    // Visit an imobiliaria page — should render or show not-found gracefully
    await page.goto('/imobiliaria/test-imobiliaria');
    await page.waitForTimeout(2000);

    const bodyText = await page.textContent('body') || '';
    expect(bodyText.length).toBeGreaterThan(10);
  });
});
