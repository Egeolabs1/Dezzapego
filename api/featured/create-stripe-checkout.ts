import Stripe from 'stripe';
import { getSiteUrl, jsonResponse, prepareFeaturedPayment } from '../_payments';

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, { status: 405 });
  }

  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return jsonResponse({ error: 'STRIPE_SECRET_KEY não configurada.' }, { status: 500 });
    }

    const { supabase, user, plan, payment, ad } = await prepareFeaturedPayment(req, 'stripe');
    const siteUrl = getSiteUrl();
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' });
    const description = `${plan.name} - ${ad.title || 'Anúncio Dezzapego'}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${siteUrl}/meus-anuncios?featured=success&payment=${payment.id}`,
      cancel_url: `${siteUrl}/meus-anuncios?featured=cancel&payment=${payment.id}`,
      customer_email: user.email || undefined,
      client_reference_id: payment.id,
      metadata: {
        paymentId: payment.id,
        adId: ad.id,
        planId: plan.id,
        userId: user.id,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (plan.currency || 'BRL').toLowerCase(),
            unit_amount: plan.price_cents,
            product_data: {
              name: plan.name,
              description,
            },
          },
        },
      ],
    });

    const { error } = await supabase
      .from('featured_payments')
      .update({
        external_id: session.id,
        checkout_url: session.url,
        provider_payload: session,
      })
      .eq('id', payment.id);

    if (error) throw error;

    return jsonResponse({ provider: 'stripe', paymentId: payment.id, checkoutUrl: session.url });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('create-stripe-checkout error:', error);
    return jsonResponse({ error: 'Erro ao criar Checkout Stripe.' }, { status: 500 });
  }
}
