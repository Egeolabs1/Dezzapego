#!/usr/bin/env node
import { spawn } from 'node:child_process';

const port = Number(process.env.SMOKE_PORT || 3100);
const baseUrl = `http://127.0.0.1:${port}`;

const env = {
  ...process.env,
  NODE_ENV: 'production',
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://dezzapego.com',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_smoke',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_smoke',
  PIXGO_WEBHOOK_SECRET: process.env.PIXGO_WEBHOOK_SECRET || 'pixgo_smoke',
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}/`);
      if (response.ok) return;
    } catch {
      await wait(500);
    }
  }
  throw new Error('Next server did not become ready in time.');
}

async function expectPage(path, text) {
  const response = await fetchWithTimeout(`${baseUrl}${path}`);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  const body = await response.text();
  if (!body.includes(text)) throw new Error(`${path} did not include expected text: ${text}`);
}

async function expectXml(path, text) {
  const response = await fetchWithTimeout(`${baseUrl}${path}`);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  const body = await response.text();
  if (!body.includes(text)) throw new Error(`${path} did not include expected XML text: ${text}`);
}

async function expectRejectedWebhook(path, init, expectedStatus) {
  const response = await fetchWithTimeout(`${baseUrl}${path}`, init);
  if (response.status !== expectedStatus) {
    throw new Error(`${path} returned ${response.status}; expected ${expectedStatus}`);
  }
}

const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port)], {
  env,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
child.stdout.on('data', (chunk) => {
  output += chunk.toString();
});
child.stderr.on('data', (chunk) => {
  output += chunk.toString();
});

try {
  await waitForServer();
  await expectPage('/', 'Dezzapego');
  await expectPage('/register', 'Crie sua conta');
  await expectPage('/login', 'Entrar na Conta');
  await expectPage('/categoria/imoveis', 'Dezzapego');
  await expectXml('/api/sitemap.xml', '<urlset');
  await expectXml('/api/sitemap.xml', '/guias/como-vender-com-seguranca');
  await expectRejectedWebhook('/api/stripe-webhook', { method: 'POST', body: '{}' }, 400);
  await expectRejectedWebhook(
    '/api/pixgo-webhook',
    {
      method: 'POST',
      headers: {
        'x-webhook-timestamp': String(Math.floor(Date.now() / 1000)),
        'x-webhook-signature': '00',
      },
      body: '{}',
    },
    401,
  );
  console.log('[smoke] ok');
} catch (error) {
  console.error('[smoke] failed:', error);
  if (output.trim()) console.error(output);
  process.exitCode = 1;
} finally {
  child.kill();
}
