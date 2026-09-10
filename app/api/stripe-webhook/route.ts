import Stripe from 'stripe';
import {
  activateAccountPlan,
  activateFeaturedAd,
  getSupabaseAdmin,
  jsonResponse,
  markAccountPlanPaymentStatus,
  markPaymentStatus,
  shouldRenewStripeInvoice,
} from '@/lib/payments';

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    return jsonResponse({ error: 'Serviço de pagamento não configurado.' }, { status: 500 });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return jsonResponse({ error: 'Assinatura Stripe ausente.' }, { status: 400 });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-04-22.dahlia' as any });
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    const supabase = getSupabaseAdmin();

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.paymentId || session.client_reference_id;
      const paymentType = session.metadata?.type;

      if (paymentId && (session.payment_status === 'paid' || event.type === 'checkout.session.async_payment_succeeded')) {
        if (paymentType === 'account_plan') {
          await supabase
            .from('account_plan_payments')
            .update({
              external_id: session.subscription || session.id,
              external_checkout_id: session.id,
              webhook_payload: event,
            })
            .eq('id', paymentId);

          await activateAccountPlan(
            supabase,
            paymentId,
            typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || null,
          );
        } else {
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
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.paymentId || session.client_reference_id;
      if (paymentId) {
        if (session.metadata?.type === 'account_plan') {
          await markAccountPlanPaymentStatus(supabase, paymentId, 'expired', event);
        } else {
          await markPaymentStatus(supabase, paymentId, 'expired', event);
        }
      }
    }

    if (event.type === 'invoice.paid' || event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id?: string } | null; billing_reason?: string | null };
      const subscriptionId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;

      if (subscriptionId && shouldRenewStripeInvoice(invoice.billing_reason)) {
        const { error } = await supabase.rpc('renew_stripe_account_plan', {
          p_subscription_id: subscriptionId,
          p_event_id: event.id,
        });
        if (error) throw error;
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase
        .from('user_account_subscriptions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('external_subscription_id', subscription.id);
    }

    return jsonResponse({ received: true });
  } catch (error) {
    console.error('stripe-webhook error:', error);
    return jsonResponse({ error: 'Erro ao processar webhook.' }, { status: 500 });
  }
}
