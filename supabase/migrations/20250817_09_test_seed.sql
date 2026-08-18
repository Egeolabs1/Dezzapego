-- =============================================================================
-- SEED: Usuários de teste para Playwright E2E
-- Cria 5 usuários via auth.users + businesses + business_members
-- Executa: supabase db reset  (ou aplique manualmente)
-- =============================================================================

-- 1. UUIDs fixos para os 5 usuários de teste
--    (mantidos fixos para que os testes possam referenciar por businessId)
DO $$
DECLARE
  v_userA_id  uuid := 'a1111111-1111-4111-8111-111111111111';
  v_userB_id  uuid := 'b2222222-2222-4222-8222-222222222222';
  v_userC_id  uuid := 'c3333333-3333-4333-8333-333333333333';
  v_viewer_id uuid := 'd4444444-4444-4444-8444-444444444444';
  v_agent_id  uuid := 'e5555555-5555-4555-8555-555555555555';

  v_biz_a_id  uuid := 'aa111111-1111-4111-8111-aaaaaaaaaaaa';
  v_biz_b_id  uuid := 'bb222222-2222-4222-8222-bbbbbbbbbbbb';
BEGIN

-- =============================================================================
-- 2. Usuários em auth.users
-- =============================================================================
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, confirmation_token,
  email_change_token_new, recovery_token, is_super_admin, raw_app_meta_data, raw_user_meta_data
) VALUES
  -- userA (owner)
  ('00000000-0000-0000-0000-000000000000', v_userA_id, 'authenticated', 'authenticated',
   'test.userA@dezzapego.test',
   crypt('TestUserA1!', gen_salt('bf')),
   now(), now(), now(), '', '', '', false,
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"name":"Test User A"}'::jsonb),

  -- userB (owner)
  ('00000000-0000-0000-0000-000000000000', v_userB_id, 'authenticated', 'authenticated',
   'test.userB@dezzapego.test',
   crypt('TestUserB1!', gen_salt('bf')),
   now(), now(), now(), '', '', '', false,
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"name":"Test User B"}'::jsonb),

  -- userC (buyer)
  ('00000000-0000-0000-0000-000000000000', v_userC_id, 'authenticated', 'authenticated',
   'test.userC@dezzapego.test',
   crypt('TestUserC1!', gen_salt('bf')),
   now(), now(), now(), '', '', '', false,
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"name":"Test User C"}'::jsonb),

  -- viewer
  ('00000000-0000-0000-0000-000000000000', v_viewer_id, 'authenticated', 'authenticated',
   'test.viewer@dezzapego.test',
   crypt('TestViewer1!', gen_salt('bf')),
   now(), now(), now(), '', '', '', false,
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"name":"Test Viewer"}'::jsonb),

  -- agent
  ('00000000-0000-0000-0000-000000000000', v_agent_id, 'authenticated', 'authenticated',
   'test.agent@dezzapego.test',
   crypt('TestAgent1!', gen_salt('bf')),
   now(), now(), now(), '', '', '', false,
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"name":"Test Agent"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 3. Identities em auth.identities (necessário para login via email)
-- =============================================================================
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES
  (v_userA_id,  v_userA_id,  '{"sub":"a1111111-1111-4111-8111-111111111111","email":"test.userA@dezzapego.test"}'::jsonb,
   'email', now(), now(), now()),
  (v_userB_id,  v_userB_id,  '{"sub":"b2222222-2222-4222-8222-222222222222","email":"test.userB@dezzapego.test"}'::jsonb,
   'email', now(), now(), now()),
  (v_userC_id,  v_userC_id,  '{"sub":"c3333333-3333-4333-8333-333333333333","email":"test.userC@dezzapego.test"}'::jsonb,
   'email', now(), now(), now()),
  (v_viewer_id, v_viewer_id, '{"sub":"d4444444-4444-4444-8444-444444444444","email":"test.viewer@dezzapego.test"}'::jsonb,
   'email', now(), now(), now()),
  (v_agent_id,  v_agent_id,  '{"sub":"e5555555-5555-4555-8555-555555555555","email":"test.agent@dezzapego.test"}'::jsonb,
   'email', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 4. Empresas de teste (business A e B)
-- =============================================================================
INSERT INTO public.businesses (
  id, owner_id, name, slug, type, description, is_active
) VALUES
  (v_biz_a_id, v_userA_id, 'Empresa Teste A', 'empresa-teste-a', 'store',
   'Empresa de teste A — criada via seed para E2E.', true),
  (v_biz_b_id, v_userB_id, 'Empresa Teste B', 'empresa-teste-b', 'store',
   'Empresa de teste B — criada via seed para E2E.', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 5. Membros (business_members) — owners das suas respectivas empresas
-- =============================================================================
INSERT INTO public.business_members (
  business_id, user_id, role, invited_by, status
) VALUES
  (v_biz_a_id, v_userA_id, 'owner', v_userA_id, 'active'),
  (v_biz_b_id, v_userB_id, 'owner', v_userB_id, 'active')
ON CONFLICT (business_id, user_id) DO NOTHING;

-- =============================================================================
-- 6. Profiles em public.profiles (se a tabela existir)
-- =============================================================================
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES
    (v_userA_id,  'Test User A'),
    (v_userB_id,  'Test User B'),
    (v_userC_id,  'Test User C'),
    (v_viewer_id, 'Test Viewer'),
    (v_agent_id,  'Test Agent')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  -- Tabela profiles pode não existir; ignorar silenciosamente
  RAISE NOTICE 'Skipping profiles seed: %', SQLERRM;
END;

END $$;
