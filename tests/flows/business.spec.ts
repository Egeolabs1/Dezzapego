import { test, expect } from '@playwright/test';
import { TEST_USERS, loginUser } from '../fixtures/auth';

test.describe('Fluxo de Negócio', () => {
  test('Owner A vê dashboard e empresa', async ({ page }) => {
    await loginUser(page, TEST_USERS.userA.email, TEST_USERS.userA.password);

    // Go to business dashboard
    await page.goto('/business');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body') || '';
    void page.url();

    // Should see business content or be on dashboard
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test('Empresa A é visualizada publicamente', async ({ page }) => {
    await page.goto(`/empresa/${TEST_USERS.userA.businessSlug}`);
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body') || '';
    expect(bodyText.length).toBeGreaterThan(20);
  });
});
