import { type Page } from '@playwright/test';

export const TEST_USERS = {
  userA: {
    email: 'test.userA@dezzapego.test',
    password: 'TestUserA1!',
    role: 'owner' as const,
    businessId: 'aa111111-1111-4111-8111-aaaaaaaaaaaa',
    businessSlug: 'empresa-teste-a',
  },
  userB: {
    email: 'test.userB@dezzapego.test',
    password: 'TestUserB1!',
    role: 'owner' as const,
    businessId: 'bb222222-2222-4222-8222-bbbbbbbbbbbb',
    businessSlug: 'empresa-teste-b',
  },
  userC: {
    email: 'test.userC@dezzapego.test',
    password: 'TestUserC1!',
    role: 'buyer' as const,
    businessId: '',
    businessSlug: '',
  },
  viewer: {
    email: 'test.viewer@dezzapego.test',
    password: 'TestViewer1!',
    role: 'viewer' as const,
    businessId: '',
    businessSlug: '',
  },
  agent: {
    email: 'test.agent@dezzapego.test',
    password: 'TestAgent1!',
    role: 'agent' as const,
    businessId: '',
    businessSlug: '',
  },
} as const;

/**
 * Login via the UI form. Throws on failure — tests MUST NOT skip.
 */
export async function loginUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login');
  await page.waitForSelector('#email', { timeout: 10_000 });
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');

  // Wait for redirect away from /login — if this times out, the test FAILS
  await page.waitForURL(
    (url) => !url.pathname.includes('/login'),
    { timeout: 15_000 },
  );
}

/**
 * Register a new user via the UI form.
 */
export async function registerUser(
  page: Page,
  email: string,
  password: string,
  name: string,
): Promise<void> {
  await page.goto('/register');
  await page.waitForSelector('#name', { timeout: 10_000 });
  await page.fill('#name', name);
  await page.fill('#phone', '(11) 99999-9999');
  await page.fill('#document', '529.982.247-25');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.fill('#confirmPassword', password);
  await page.check('#terms');
  await page.click('button[type="submit"]');
}

/**
 * Logout via UI.
 */
export async function logoutUser(page: Page): Promise<void> {
  const userMenuBtn = page.locator('button').filter({ has: page.locator('.rounded-full') }).first();
  await userMenuBtn.click();
  const logoutLink = page.locator('text=Sair');
  await logoutLink.click();
  await page.waitForURL(
    (url) => url.pathname === '/' || url.pathname === '/login',
    { timeout: 10_000 },
  );
}
