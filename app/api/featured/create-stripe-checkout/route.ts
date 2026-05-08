import Stripe from 'stripe';
import { validateDiscountCoupon, normalizeCouponCode } from '@/lib/discountCoupons';
import { getAuthenticatedUser, getSiteUrl, getSupabaseAdmin, jsonResponse, userOwnsAd } from '@/lib/payments';

type RequestBody = {
  adId?: string;
  planId?: string;
  couponCode?: string;
};

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return jsonResponse({ error: 'STRIPE_SECRET_KEY não configurado.' }, { status: 500 });
  }

  try {
    const body = await req.json() as RequestBody;
    if (!body.adId || !body.planId) {
      return jsonResponse({ error: 'Anúncio e plano são obrigatórios.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const user = await getAuthenticatedUser(req, supabase);
    const ownership = await userOwnsAd(supabase, body.adId, user.id);
    if (!ownership.owns) return jsonResponse({ error: 'Anúncio não pertence ao usuário.' }, { status: 403 });

    const { data: plan, error: planError } = await supabase
      .from('featured_plans')
      .select('*')
      .eq('id', body.planId)
      .eq('active', true)
      .maybeSingle();

    if (planError) throw planError;
    if (!plan) return jsonResponse({ error: 'Plano de destaque não encontrado.' }, { status: 404 });
    const couponResult = await validateDiscountCoupon(supabase, body.couponCode, 'featured', Number(plan.price_cents));
    if (couponResult.error) return jsonResponse({ error: couponResult.error }, { status: 400 });
    if (couponResult.finalAmountCents <= 0) {
      return jsonResponse({ error: 'Stripe não aceita checkout com valor zero. Use um cupom menor que 100%.' }, { status: 400 });
    }

    const { data: payment, error: paymentError } = await supabase
      .from('featured_payments')
      .insert({
        ad_id: body.adId,
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
      mode: 'payment',
      client_reference_id: payment.id,
      customer_email: user.email || undefined,
      line_items: [
        {
          price_data: {
            currency: String(plan.currency || 'BRL').toLowerCase(),
            unit_amount: couponResult.finalAmountCents,
            product_data: {
              name: plan.name,
              description: `Destaque para anúncio: ${ownership.ad?.title || body.adId}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'featured_ad',
        paymentId: payment.id,
        adId: body.adId,
        planId: plan.id,
        userId: user.id,
        couponCode: couponResult.coupon ? normalizeCouponCode(body.couponCode) : '',
      },
      success_url: `${siteUrl}/meus-anuncios?featured=success`,
      cancel_url: `${siteUrl}/meus-anuncios?featured=cancel`,
    });

    await supabase
      .from('featured_payments')
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
    console.error('create featured stripe checkout error:', error);
    return jsonResponse({ error: 'Erro ao iniciar checkout Stripe.' }, { status: 400 });
  }
}
