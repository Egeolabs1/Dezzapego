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

test.describe('Feature Flag Enforcement — Server-side', () => {
  test('Free plan: direct RPC call for CRM feature returns false', async ({ page }) => {
    // Business B has no subscription (free plan)
    await loginUser(page, TEST_USERS.userB.email, TEST_USERS.userB.password);

    const token = await getToken(page);
    expect(token).not.toBeNull();

    const result = await page.evaluate(async ({ bizId, url, anonKey, token }) => {
      const response = await fetch(`${url}/rest/v1/rpc/check_feature_flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ p_business_id: bizId, p_flag_name: 'crm' }),
      });
      const data = await response.json();
      return { data, error: response.ok ? null : (data?.message || JSON.stringify(data)) };
    }, { bizId: TEST_USERS.userB.businessId, url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, token });

    if (!result.error) {
      expect(result.data).toBeFalsy();
    }
  });

  test('Pro plan: CRM feature is allowed', async ({ page }) => {
    // Business A has Pro subscription (from seed)
    await loginUser(page, TEST_USERS.userA.email, TEST_USERS.userA.password);

    const token = await getToken(page);
    expect(token).not.toBeNull();

    const result = await page.evaluate(async ({ bizId, url, anonKey, token }) => {
      const response = await fetch(`${url}/rest/v1/rpc/check_feature_flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ p_business_id: bizId, p_flag_name: 'crm' }),
      });
      const data = await response.json();
      return { data, error: response.ok ? null : (data?.message || JSON.stringify(data)) };
    }, { bizId: TEST_USERS.userA.businessId, url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, token });

    expect(result.error).toBeNull();
    expect(result.data).toBeTruthy();
  });

  test('Business A cannot use Business B entitlements', async ({ page }) => {
    await loginUser(page, TEST_USERS.userA.email, TEST_USERS.userA.password);

    const token = await getToken(page);
    expect(token).not.toBeNull();

    const result = await page.evaluate(async ({ bizIdB, url, anonKey, token }) => {
      const response = await fetch(`${url}/rest/v1/rpc/get_plan_features`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ p_business_id: bizIdB }),
      });
      const data = await response.json();
      return { data, error: response.ok ? null : (data?.message || JSON.stringify(data)) };
    }, { bizIdB: TEST_USERS.userB.businessId, url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, token });

    if (!result.error && result.data) {
      const features = result.data as Record<string, unknown>;
      expect(features.crm).toBeFalsy();
    }
  });

  test('Free plan: import_csv feature returns false', async ({ page }) => {
    await loginUser(page, TEST_USERS.userB.email, TEST_USERS.userB.password);

    const token = await getToken(page);
    expect(token).not.toBeNull();

    const result = await page.evaluate(async ({ bizId, url, anonKey, token }) => {
      const response = await fetch(`${url}/rest/v1/rpc/check_feature_flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ p_business_id: bizId, p_flag_name: 'import_csv' }),
      });
      const data = await response.json();
      return { data, error: response.ok ? null : (data?.message || JSON.stringify(data)) };
    }, { bizId: TEST_USERS.userB.businessId, url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, token });

    if (!result.error) {
      expect(result.data).toBeFalsy();
    }
  });

  test('Pro plan: import_csv feature is allowed', async ({ page }) => {
    await loginUser(page, TEST_USERS.userA.email, TEST_USERS.userA.password);

    const token = await getToken(page);
    expect(token).not.toBeNull();

    const result = await page.evaluate(async ({ bizId, url, anonKey, token }) => {
      const response = await fetch(`${url}/rest/v1/rpc/check_feature_flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ p_business_id: bizId, p_flag_name: 'import_csv' }),
      });
      const data = await response.json();
      return { data, error: response.ok ? null : (data?.message || JSON.stringify(data)) };
    }, { bizId: TEST_USERS.userA.businessId, url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, token });

    expect(result.error).toBeNull();
    expect(result.data).toBeTruthy();
  });
});
