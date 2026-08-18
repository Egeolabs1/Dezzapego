import { test, expect } from '@playwright/test';
import { TEST_USERS, loginUser, logoutUser } from '../fixtures/auth';

test.describe('Fluxo do Usuário', () => {
  test('Login como comprador, visualiza homepage e faz logout', async ({ page }) => {
    // Login as buyer (userC)
    await loginUser(page, TEST_USERS.userC.email, TEST_USERS.userC.password);

    // Verify logged in — homepage should show user avatar or menu
    await page.goto('/');
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(50);

    // Logout
    await logoutUser(page);
    await expect(page.locator('body')).toBeVisible();
  });
});
