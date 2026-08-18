import Stripe from 'stripe';
import { validateDiscountCoupon, normalizeCouponCode } from '@/lib/discountCoupons';
import { getAuthenticatedUser, getSiteUrl, getSupabaseAdmin, jsonResponse } from '@/lib/payments';

type RequestBody = {
  planId?: string;
  couponCode?: string;
};

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return jsonResponse({ error: 'Serviço de pagamento não configurado.' }, { status: 500 });
  }

  try {
    const body = await req.json() as RequestBody;
    if (!body.planId) {
      return jsonResponse({ error: 'Plano ausente.' }, { status: 400 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.planId)) {
      return jsonResponse({ error: 'ID de plano inválido.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const user = await getAuthenticatedUser(req, supabase);

    const { data: plan, error: planError } = await supabase
      .from('account_plans')
      .select('*')
      .eq('id', body.planId)
      .eq('active', true)
      .maybeSingle();

    if (planError) throw planError;
    if (!plan) return jsonResponse({ error: 'Plano não encontrado.' }, { status: 404 });
    if (Number(plan.price_cents || 0) <= 0) {
      return jsonResponse({ error: 'Plano gratuito não precisa de pagamento.' }, { status: 400 });
    }

    const couponResult = await validateDiscountCoupon(supabase, body.couponCode, 'account_plan', Number(plan.price_cents));
    if (couponResult.error) return jsonResponse({ error: couponResult.error }, { status: 400 });
    if (couponResult.finalAmountCents <= 0) {
      return jsonResponse({ error: 'Stripe não aceita checkout com valor zero. Use um cupom menor que 100%.' }, { status: 400 });
    }

    const { data: payment, error: paymentError } = await supabase
      .from('account_plan_payments')
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        provider: 'stripe',
        status: 'pending',
        amount_cents: couponResult.finalAmountCents,
        gross_amount_cents: plan.price_cents,
        discount_cents: couponResult.discountCents,
        coupon_id: couponResult.coupon?.id || null,
        coupon_code: couponResult.coupon ? normalizeCouponCode(body.couponCode) : null,
        currency: plan.currency || 'BRL',
      })
      .select('id')
      .single();

    if (paymentError) throw paymentError;

    const siteUrl = getSiteUrl();
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-04-22.dahlia' as any });
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      client_reference_id: payment.id,
      customer_email: user.email || undefined,
      line_items: [
        {
          price_data: {
            currency: String(plan.currency || 'BRL').toLowerCase(),
            unit_amount: couponResult.finalAmountCents,
            recurring: { interval: 'month' },
            product_data: {
              name: `Dezzapego ${plan.name}`,
              description: plan.description || undefined,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'account_plan',
        paymentId: payment.id,
        planId: plan.id,
        userId: user.id,
        couponCode: couponResult.coupon ? normalizeCouponCode(body.couponCode) : '',
      },
      subscription_data: {
        metadata: {
          type: 'account_plan',
          paymentId: payment.id,
          planId: plan.id,
          userId: user.id,
          couponCode: couponResult.coupon ? normalizeCouponCode(body.couponCode) : '',
        },
      },
      success_url: `${siteUrl}/dashboard?plan=success`,
      cancel_url: `${siteUrl}/checkout/plano?plan=${encodeURIComponent(plan.id)}&payment=cancel`,
    });

    await supabase
      .from('account_plan_payments')
      .update({
        external_checkout_id: session.id,
        checkout_url: session.url,
        provider_payload: session,
      })
      .eq('id', payment.id);

    return jsonResponse({
      provider: 'stripe',
      paymentId: payment.id,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error('create account plan stripe checkout error:', error);
    return jsonResponse({ error: 'Erro ao iniciar checkout Stripe.' }, { status: 500 });
  }
}
