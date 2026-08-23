import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually — Playwright globalSetup doesn't have Next.js env loading
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '..', '.env');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    console.warn('[global-setup] Could not load .env file');
  }
}
loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const fetchWithTimeout: typeof fetch = async (input, init = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

// Fixed UUIDs — MUST match tests/fixtures/auth.ts TEST_USERS
const USERS = {
  userA:    { id: 'a1111111-1111-4111-8111-111111111111', email: 'test.userA@dezzapego.test',    password: 'TestUserA1!',  name: 'Test User A' },
  userB:    { id: 'b2222222-2222-4222-8222-222222222222', email: 'test.userB@dezzapego.test',    password: 'TestUserB1!',  name: 'Test User B' },
  userC:    { id: 'c3333333-3333-4333-8333-333333333333', email: 'test.userC@dezzapego.test',    password: 'TestUserC1!',  name: 'Test User C' },
  viewer:   { id: 'd4444444-4444-4444-8444-444444444444', email: 'test.viewer@dezzapego.test',   password: 'TestViewer1!', name: 'Test Viewer' },
  agent:    { id: 'e5555555-5555-4555-8555-555555555555', email: 'test.agent@dezzapego.test',    password: 'TestAgent1!',  name: 'Test Agent' },
};

const BIZ_A = { id: 'aa111111-1111-4111-8111-aaaaaaaaaaaa', slug: 'empresa-teste-a', name: 'Empresa Teste A' };
const BIZ_B = { id: 'bb222222-2222-4222-8222-bbbbbbbbbbbb', slug: 'empresa-teste-b', name: 'Empresa Teste B' };

// Fixed UUID for subscription — used with onConflict: 'id'
const SUB_A_ID = '33333333-3333-4333-9333-333333333301';

export default async function globalSetup() {
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: fetchWithTimeout },
  });

  // 0. Apply RPC fix via direct DB connection — ensures search_ads_by_location
  //    correctly excludes ads with NULL lat/lng from radius searches.
  //    Uses CREATE OR REPLACE so it's idempotent.
  try {
    const { Pool } = await import('pg');
    const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
    if (dbUrl) {
      const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10_000,
        idleTimeoutMillis: 5_000,
        statement_timeout: 20_000,
        query_timeout: 20_000,
      });
      const rpcFixSql = readFileSync(
        resolve(__dirname, '..', 'supabase', 'migrations', '20250818_01_fix_geolocation_rpcs.sql'),
        'utf-8',
      );
      await pool.query(rpcFixSql);
      await pool.end();
      console.log('  ✓ RPC fix applied (search_ads_by_location)');
    } else {
      console.warn('  [global-setup] No SUPABASE_DB_URL — RPC fix must be applied manually in SQL Editor');
    }
  } catch (e: any) {
    console.warn(`  [global-setup] RPC fix skipped: ${e.message}`);
  }

  console.log('[global-setup] Seeding E2E test data...');

  // 1. Create users via Supabase Auth Admin API
  for (const u of Object.values(USERS)) {
    const { error } = await admin.auth.admin.createUser({
      id: u.id,
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.name },
    });
    if (error && !error.message.includes('already exists')) {
      console.error(`  [WARN] User ${u.email}: ${error.message}`);
    }
  }
  console.log('  ✓ Users');

  // 2. Create businesses
  for (const biz of [BIZ_A, BIZ_B]) {
    const owner = biz === BIZ_A ? USERS.userA : USERS.userB;
    const { error } = await admin.from('businesses').upsert({
      id: biz.id,
      owner_id: owner.id,
      name: biz.name,
      slug: biz.slug,
      type: 'store',
      description: `${biz.name} — seeded for E2E.`,
      is_active: true,
    }, { onConflict: 'id' });
    if (error) console.error(`  [WARN] Business ${biz.slug}: ${error.message}`);
  }
  console.log('  ✓ Businesses');

  // 3. Create business_members
  for (const [userId, bizId, role] of [
    [USERS.userA.id, BIZ_A.id, 'owner'],
    [USERS.userB.id, BIZ_B.id, 'owner'],
  ] as const) {
    const { error } = await admin.from('business_members').upsert({
      business_id: bizId,
      user_id: userId,
      role,
      invited_by: userId,
      status: 'active',
    }, { onConflict: 'business_id,user_id' });
    if (error) console.error(`  [WARN] Membership: ${error.message}`);
  }
  console.log('  ✓ Memberships');

  // 4. Create test ads with coordinates (for geolocation tests)
  // The ads table stores location in a JSONB 'location' column and has top-level lat/lng.
  // Actual columns: id, user_id, title, price, description, category, subcategory,
  //   location (JSONB: { city, state, lat, lng, neighborhood }), lat, lng,
  //   images, seller, featured, status, views, details
  const TEST_ADS = [
    { id: '11111111-1111-4111-a111-111111111101', user_id: USERS.userA.id, title: 'Apt Vila Mariana', price: 450000, category: 'Imóveis', lat: -23.5886, lng: -46.6393, city: 'São Paulo', state: 'SP', neighborhood: 'Vila Mariana' },
    { id: '11111111-1111-4111-a111-111111111102', user_id: USERS.userA.id, title: 'Carro Honda Civic', price: 85000, category: 'Autos e Peças', lat: -23.6007, lng: -46.6594, city: 'São Paulo', state: 'SP', neighborhood: 'Mooca' },
    { id: '11111111-1111-4111-a111-111111111103', user_id: USERS.userB.id, title: 'Apt Copacabana', price: 700000, category: 'Imóveis', lat: -22.9711, lng: -43.1822, city: 'Rio de Janeiro', state: 'RJ', neighborhood: 'Copacabana' },
    { id: '11111111-1111-4111-a111-111111111104', user_id: USERS.userA.id, title: 'Notebook Dell', price: 3500, category: 'Eletrônicos e Celulares', lat: -23.5325, lng: -46.7915, city: 'Osasco', state: 'SP', neighborhood: 'Centro' },
    { id: '11111111-1111-4111-a111-111111111105', user_id: USERS.userA.id, title: 'Casa Santo André', price: 320000, category: 'Imóveis', lat: -23.6735, lng: -46.5435, city: 'Santo André', state: 'SP', neighborhood: 'Centro' },
    { id: '11111111-1111-4111-a111-111111111106', user_id: USERS.userB.id, title: 'Apt BH', price: 280000, category: 'Imóveis', lat: -19.9167, lng: -43.9345, city: 'Belo Horizonte', state: 'MG', neighborhood: 'Savassi' },
  ];

  for (const ad of TEST_ADS) {
    const { error } = await admin.from('ads').upsert({
      id: ad.id,
      user_id: ad.user_id,
      title: ad.title,
      price: ad.price,
      category: ad.category,
      status: 'active',
      lat: ad.lat,
      lng: ad.lng,
      location: { city: ad.city, state: ad.state, neighborhood: ad.neighborhood, lat: ad.lat, lng: ad.lng },
      images: [],
      description: `E2E test ad: ${ad.title}`,
    }, { onConflict: 'id' });
    if (error) console.error(`  [WARN] Ad ${ad.id}: ${error.message}`);
  }
  console.log('  ✓ Test ads (6 with coordinates)');

  // 5. Create test lead for CRM tests
  // Schema: leads has name (text NOT NULL), phone (text NOT NULL), email (text), source (text), status (lead_status enum)
  const { error: leadErr } = await admin.from('leads').upsert({
    id: '22222222-2222-4222-b222-222222222201',
    business_id: BIZ_A.id,
    user_id: USERS.userC.id,
    name: 'Lead Teste A',
    email: 'lead-a@test.com',
    phone: '11999990001',
    source: 'whatsapp',
    status: 'novo',
  }, { onConflict: 'id' });
  if (leadErr) console.error(`  [WARN] Lead: ${leadErr.message}`);
  console.log('  ✓ Test leads');

  // 6. Create Pro subscription for Business A
  // business_subscriptions has NO unique constraint on business_id — PK is id only.
  // Use a fixed UUID with onConflict: 'id' for idempotent upsert.
  const { data: proPlan } = await admin.from('business_plans').select('id').eq('tier', 'pro').single();
  if (proPlan) {
    const { error: subErr } = await admin.from('business_subscriptions').upsert({
      id: SUB_A_ID,
      business_id: BIZ_A.id,
      plan_id: proPlan.id,
      tier: 'pro',
      status: 'active',
      started_at: new Date().toISOString(),
      payment_method: 'pix',
    }, { onConflict: 'id' });
    if (subErr) console.error(`  [WARN] Subscription: ${subErr.message}`);
  }
  console.log('  ✓ Subscriptions');

  console.log('[global-setup] Done.');
}
