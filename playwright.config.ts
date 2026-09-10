import { defineConfig } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env for Playwright test runner
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '.env');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch { /* ignore */ }
}
loadEnv();

const e2eSupabaseUrl = process.env.E2E_SUPABASE_URL;
const e2eSupabaseAnonKey = process.env.E2E_SUPABASE_ANON_KEY;
const e2eServiceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;

if (!e2eSupabaseUrl || !e2eSupabaseAnonKey || !e2eServiceRoleKey) {
  throw new Error('E2E_SUPABASE_URL, E2E_SUPABASE_ANON_KEY e E2E_SUPABASE_SERVICE_ROLE_KEY são obrigatórios para impedir que os testes gravem na base de produção.');
}

process.env.NEXT_PUBLIC_SUPABASE_URL = e2eSupabaseUrl;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = e2eSupabaseAnonKey;
process.env.SUPABASE_SERVICE_ROLE_KEY = e2eServiceRoleKey;

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/unit/**'],
  globalSetup: './tests/global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],

  webServer: {
    command: 'npm run build && npm run start -- -p 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
