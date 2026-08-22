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
  // Atomic: only transition from non-paid to paid
  const { data: payment, error: paymentError } = await supabase
    .from('featured_payments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .neq('status', 'paid')
    .select('*, featured_plans(duration_days)')
    .maybeSingle();

  if (paymentError) throw paymentError;
  if (!payment) {
    // Already paid or doesn't exist - check if it exists at all
    const { data: existing } = await supabase
      .from('featured_payments')
      .select('id, status')
      .eq('id', paymentId)
      .maybeSingle();
    if (!existing) throw new Error(`Pagamento não encontrado: ${paymentId}`);
    // Already paid - idempotent success
    return { payment: existing, expiresAt: null };
  }

  const shouldCountCoupon = payment.coupon_id;

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

  await supabase
    .from('featured_payments')
    .update({ expires_at: expiresAt.toISOString() })
    .eq('id', paymentId);

  const { error: updateAdError } = await supabase
    .from('ads')
    .update({
      featured: true,
      featured_expires_at: expiresAt.toISOString(),
    })
    .eq('id', payment.ad_id);

  if (updateAdError) throw updateAdError;
  if (shouldCountCoupon) await incrementCouponUsage(supabase, payment.coupon_id);
  await enqueuePaymentStatusEmail(supabase, { userId: payment.user_id, paymentId, status: 'paid', description: 'o destaque do anúncio' });

  return { payment, expiresAt: expiresAt.toISOString() };
}

export async function activateAccountPlan(supabase: SupabaseClient, paymentId: string) {
  // Atomic: only transition from non-paid to paid
  const { data: payment, error: paymentError } = await supabase
    .from('account_plan_payments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .neq('status', 'paid')
    .select('*, account_plans(*)')
    .maybeSingle();

  if (paymentError) throw paymentError;
  if (!payment) {
    const { data: existing } = await supabase
      .from('account_plan_payments')
      .select('id, status')
      .eq('id', paymentId)
      .maybeSingle();
    if (!existing) throw new Error(`Pagamento de plano não encontrado: ${paymentId}`);
    return { payment: existing, expiresAt: null };
  }

  const shouldCountCoupon = payment.coupon_id;

  const now = new Date();
  const { data: currentSubscription, error: subscriptionLookupError } = await supabase
    .from('user_account_subscriptions')
    .select('current_period_end')
    .eq('user_id', payment.user_id)
    .maybeSingle();

  if (subscriptionLookupError) throw subscriptionLookupError;

  const currentExpiration = currentSubscription?.current_period_end
    ? new Date(currentSubscription.current_period_end)
    : payment.expires_at
      ? new Date(payment.expires_at)
      : null;
  const startsAt = currentExpiration && currentExpiration > now ? currentExpiration : now;
  const expiresAt = new Date(startsAt);
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  const plan = payment.account_plans as {
    max_active_ads?: number | null;
    max_photos_per_ad?: number | null;
    monthly_featured_ads?: number | null;
  } | null;

  await supabase
    .from('account_plan_payments')
    .update({ expires_at: expiresAt.toISOString() })
    .eq('id', paymentId);

  const { error: subscriptionError } = await supabase
    .from('user_account_subscriptions')
    .upsert({
      user_id: payment.user_id,
      plan_id: payment.plan_id,
      status: 'active',
      provider: payment.provider,
      current_period_start: startsAt.toISOString(),
      current_period_end: expiresAt.toISOString(),
      max_active_ads: plan?.max_active_ads ?? null,
      max_photos_per_ad: plan?.max_photos_per_ad ?? null,
      monthly_featured_ads: plan?.monthly_featured_ads ?? 0,
      updated_at: now.toISOString(),
    }, { onConflict: 'user_id' });

  if (subscriptionError) throw subscriptionError;
  if (shouldCountCoupon) await incrementCouponUsage(supabase, payment.coupon_id);
  await enqueuePaymentStatusEmail(supabase, { userId: payment.user_id, paymentId, status: 'paid', description: 'a assinatura do plano' });

  return { payment, expiresAt: expiresAt.toISOString() };
}

async function incrementCouponUsage(supabase: SupabaseClient, couponId: string) {
  // Atomic increment to prevent race conditions
  const { error } = await supabase.rpc('increment_coupon_usage', {
    p_coupon_id: couponId,
  });

  // Fallback to non-RPC if RPC doesn't exist
  if (error) {
    const { data: coupon, error: couponError } = await supabase
      .from('discount_coupons')
      .select('used_count')
      .eq('id', couponId)
      .maybeSingle();

    if (couponError || !coupon) return;

    const { error: updateError } = await supabase
      .from('discount_coupons')
      .update({ used_count: Number(coupon.used_count || 0) + 1 })
      .eq('id', couponId)
      .eq('used_count', coupon.used_count); // optimistic lock

    if (updateError) {
      // If optimistic lock failed (concurrent update), try once more
      const { data: reloaded } = await supabase
        .from('discount_coupons')
        .select('used_count')
        .eq('id', couponId)
        .maybeSingle();
      if (reloaded) {
        await supabase
          .from('discount_coupons')
          .update({ used_count: Number(reloaded.used_count || 0) + 1 })
          .eq('id', couponId);
      }
    }
  }
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
