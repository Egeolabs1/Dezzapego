import crypto from 'node:crypto';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

export type FeaturedProvider = 'stripe' | 'pixgo';
export type FeaturedPaymentStatus = 'pending' | 'paid' | 'expired' | 'refunded' | 'failed';

export type FeaturedPlan = {
  id: string;
  name: string;
  duration_days: number;
  price_cents: number;
  currency: string;
  active: boolean;
};

export type FeaturedPayment = {
  id: string;
  ad_id: string;
  user_id: string;
  plan_id: string;
  provider: FeaturedProvider;
  status: FeaturedPaymentStatus;
  amount_cents: number;
  currency: string;
  external_id: string | null;
  external_checkout_id: string | null;
};

export type CreateFeaturedPaymentInput = {
  adId?: string;
  planId?: string;
};

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
};

export function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...(init?.headers || {}),
    },
  });
}

export function getSiteUrl() {
  const raw = process.env.VITE_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');
  return raw.replace(/\/+$/, '');
}

export function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL/VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getAuthenticatedUser(req: Request, supabase: SupabaseClient): Promise<User> {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    throw new Response(JSON.stringify({ error: 'Não autenticado.' }), { status: 401, headers: jsonHeaders });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new Response(JSON.stringify({ error: 'Sessão inválida.' }), { status: 401, headers: jsonHeaders });
  }

  return data.user;
}

export async function userOwnsAd(supabase: SupabaseClient, adId: string, userId: string) {
  const { data, error } = await supabase
    .from('ads')
    .select('id, title, price, user_id, seller')
    .eq('id', adId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { owns: false, ad: null };

  const seller = data.seller as { id?: string } | null;
  return {
    owns: data.user_id === userId || seller?.id === userId,
    ad: data,
  };
}

export async function activateFeaturedAd(supabase: SupabaseClient, paymentId: string) {
  const { data: payment, error: paymentError } = await supabase
    .from('featured_payments')
    .select('*, featured_plans(duration_days)')
    .eq('id', paymentId)
    .maybeSingle();

  if (paymentError) throw paymentError;
  if (!payment) throw new Error(`Pagamento não encontrado: ${paymentId}`);

  const plan = payment.featured_plans as { duration_days?: number } | null;
  const durationDays = Number(plan?.duration_days || 0);
  if (!durationDays) throw new Error(`Plano inválido para pagamento ${paymentId}`);

  const { data: ad, error: adError } = await supabase
    .from('ads')
    .select('id, featured_expires_at')
    .eq('id', payment.ad_id)
    .maybeSingle();

  if (adError) throw adError;
  if (!ad) throw new Error(`Anúncio não encontrado: ${payment.ad_id}`);

  const now = new Date();
  const currentExpiration = ad.featured_expires_at ? new Date(ad.featured_expires_at) : null;
  const startsAt = currentExpiration && currentExpiration > now ? currentExpiration : now;
  const expiresAt = new Date(startsAt);
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  const { error: updatePaymentError } = await supabase
    .from('featured_payments')
    .update({
      status: 'paid',
      paid_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .eq('id', paymentId);

  if (updatePaymentError) throw updatePaymentError;

  const { error: updateAdError } = await supabase
    .from('ads')
    .update({
      featured: true,
      featured_expires_at: expiresAt.toISOString(),
    })
    .eq('id', payment.ad_id);

  if (updateAdError) throw updateAdError;

  return { payment, expiresAt: expiresAt.toISOString() };
}

export async function prepareFeaturedPayment(req: Request, provider: FeaturedProvider) {
  const supabase = getSupabaseAdmin();
  const user = await getAuthenticatedUser(req, supabase);
  const body = (await req.json()) as CreateFeaturedPaymentInput;
  const adId = body.adId?.trim();
  const planId = body.planId?.trim();

  if (!adId || !planId) {
    throw new Response(JSON.stringify({ error: 'Informe adId e planId válidos.' }), { status: 400, headers: jsonHeaders });
  }

  const ownership = await userOwnsAd(supabase, adId, user.id);
  if (!ownership.ad) {
    throw new Response(JSON.stringify({ error: 'Anúncio não encontrado.' }), { status: 404, headers: jsonHeaders });
  }
  if (!ownership.owns) {
    throw new Response(JSON.stringify({ error: 'Você só pode destacar seus próprios anúncios.' }), { status: 403, headers: jsonHeaders });
  }

  const { data: plan, error: planError } = await supabase
    .from('featured_plans')
    .select('*')
    .eq('id', planId)
    .eq('active', true)
    .maybeSingle<FeaturedPlan>();

  if (planError) throw planError;
  if (!plan) {
    throw new Response(JSON.stringify({ error: 'Plano de destaque indisponível.' }), { status: 404, headers: jsonHeaders });
  }

  const { data: payment, error: paymentError } = await supabase
    .from('featured_payments')
    .insert({
      ad_id: adId,
      user_id: user.id,
      plan_id: plan.id,
      provider,
      status: 'pending',
      amount_cents: plan.price_cents,
      gross_amount_cents: plan.price_cents,
      currency: plan.currency || 'BRL',
    })
    .select('*')
    .single();

  if (paymentError) throw paymentError;

  return { supabase, user, plan, payment, ad: ownership.ad };
}

export async function markPaymentStatus(supabase: SupabaseClient, paymentId: string, status: FeaturedPaymentStatus, payload?: unknown) {
  const updates: Record<string, unknown> = {
    status,
    webhook_payload: payload,
  };

  const { error } = await supabase
    .from('featured_payments')
    .update(updates)
    .eq('id', paymentId);

  if (error) throw error;
}

export function verifyHmacSha256Signature(rawBody: string, timestamp: string | null, signature: string | null, secret: string) {
  if (!timestamp || !signature) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'hex');
  const signatureBuffer = Buffer.from(signature, 'hex');

  return expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}
