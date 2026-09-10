import crypto from 'node:crypto';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { enqueuePaymentStatusEmail } from './emailReminders';

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

export type AccountPlanPaymentStatus = 'pending' | 'paid' | 'expired' | 'refunded' | 'failed';

export function nextSubscriptionPeriodEnd(currentPeriodEnd: string | null | undefined, now = new Date()) {
  const currentEnd = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
  const startsAt = currentEnd && currentEnd > now ? currentEnd : now;
  const expiresAt = new Date(startsAt);
  expiresAt.setMonth(expiresAt.getMonth() + 1);
  return expiresAt;
}

export function shouldRenewStripeInvoice(billingReason: string | null | undefined) {
  return billingReason === 'subscription_cycle';
}

export function jsonResponse(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, init);
}

export function getSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://dezzapego.com');
  return raw.replace(/\/+$/, '');
}

let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.');
  }

  _supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return _supabaseAdmin;
}

export async function getAuthenticatedUser(req: Request, supabase: SupabaseClient): Promise<User> {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    throw new Response(JSON.stringify({ error: 'Não autenticado.' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new Response(JSON.stringify({ error: 'Sessão inválida.' }), { status: 401, headers: { 'content-type': 'application/json' } });
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
  const { data, error } = await supabase.rpc('activate_featured_payment', { p_payment_id: paymentId });
  if (error) throw error;
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new Error(`Pagamento não encontrado: ${paymentId}`);
  if (result.activated) {
    const { data: payment } = await supabase.from('featured_payments').select('user_id').eq('id', paymentId).single();
    if (payment?.user_id) await enqueuePaymentStatusEmail(supabase, { userId: payment.user_id, paymentId, status: 'paid', description: 'o destaque do anúncio' });
  }
  return { payment: result, expiresAt: result.expires_at || null };
}

export async function activateAccountPlan(supabase: SupabaseClient, paymentId: string, externalSubscriptionId?: string | null) {
  const { data, error } = await supabase.rpc('activate_account_plan_payment', {
    p_payment_id: paymentId,
    p_external_subscription_id: externalSubscriptionId || null,
  });
  if (error) throw error;
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new Error(`Pagamento de plano não encontrado: ${paymentId}`);
  if (result.activated) {
    const { data: payment } = await supabase.from('account_plan_payments').select('user_id').eq('id', paymentId).single();
    if (payment?.user_id) await enqueuePaymentStatusEmail(supabase, { userId: payment.user_id, paymentId, status: 'paid', description: 'a assinatura do plano' });
  }
  return { payment: result, expiresAt: result.expires_at || null };
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
  if (status === 'expired' || status === 'refunded') {
    const { data: payment } = await supabase.from('featured_payments').select('user_id').eq('id', paymentId).maybeSingle();
    if (payment?.user_id) await enqueuePaymentStatusEmail(supabase, { userId: payment.user_id, paymentId, status, description: 'o destaque do anúncio' });
  }
}

export async function markAccountPlanPaymentStatus(
  supabase: SupabaseClient,
  paymentId: string,
  status: AccountPlanPaymentStatus,
  payload?: unknown,
) {
  const { error } = await supabase
    .from('account_plan_payments')
    .update({
      status,
      webhook_payload: payload,
    })
    .eq('id', paymentId);

  if (error) throw error;
  if (status === 'expired' || status === 'refunded') {
    const { data: payment } = await supabase.from('account_plan_payments').select('user_id').eq('id', paymentId).maybeSingle();
    if (payment?.user_id) await enqueuePaymentStatusEmail(supabase, { userId: payment.user_id, paymentId, status, description: 'a assinatura do plano' });
  }
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
