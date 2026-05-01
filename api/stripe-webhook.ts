import Stripe from 'stripe';
import { activateFeaturedAd, getSupabaseAdmin, jsonResponse, markPaymentStatus } from './_payments';

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, { status: 405 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    return jsonResponse({ error: 'Stripe não configurado.' }, { status: 500 });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return jsonResponse({ error: 'Assinatura Stripe ausente.' }, { status: 400 });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' });
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    const supabase = getSupabaseAdmin();

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.paymentId || session.client_reference_id;

      if (paymentId && (session.payment_status === 'paid' || event.type === 'checkout.session.async_payment_succeeded')) {
        await supabase
          .from('featured_payments')
          .update({
            external_id: session.id,
            webhook_payload: event,
          })
          .eq('id', paymentId);

        await activateFeaturedAd(supabase, paymentId);
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.paymentId || session.client_reference_id;
      if (paymentId) {
        await markPaymentStatus(supabase, paymentId, 'expired', event);
      }
    }

    return jsonResponse({ received: true });
  } catch (error) {
    console.error('stripe-webhook error:', error);
    return jsonResponse({ error: 'Webhook Stripe inválido.' }, { status: 400 });
  }
}
