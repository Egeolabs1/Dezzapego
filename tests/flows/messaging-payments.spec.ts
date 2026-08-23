import { test, expect } from '@playwright/test';
import { TEST_USERS, loginUser } from '../fixtures/auth';

test.describe('Mensagens e pagamentos autenticados', () => {
  test('usuário autenticado acessa a central de mensagens', async ({ page }) => {
    await loginUser(page, TEST_USERS.userC.email, TEST_USERS.userC.password);
    await page.goto('/mensagens');
    await expect(page).toHaveURL(/\/mensagens$/);
    await expect(page.getByRole('heading', { name: 'Minhas mensagens' })).toBeVisible();
    await expect(page.getByText('Conversas')).toBeVisible();
  });

  test('usuário autenticado acessa o histórico centralizado de pagamentos', async ({ page }) => {
    await loginUser(page, TEST_USERS.userC.email, TEST_USERS.userC.password);
    await page.goto('/pagamentos');
    await expect(page).toHaveURL(/\/pagamentos$/);
    await expect(page.getByRole('heading', { name: 'Meus pagamentos' })).toBeVisible();
  });
});
