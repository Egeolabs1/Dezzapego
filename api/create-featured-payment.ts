import Stripe from 'stripe';
import {
  FeaturedProvider,
  FeaturedPlan,
  getAuthenticatedUser,
  getSiteUrl,
  getSupabaseAdmin,
  jsonResponse,
  userOwnsAd,
} from './_payments';

type CreateFeaturedPaymentBody = {
  adId?: string;
  planId?: string;
  provider?: FeaturedProvider;
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, { status: 405 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const user = await getAuthenticatedUser(req, supabase);
    const body = (await req.json()) as CreateFeaturedPaymentBody;
    const adId = body.adId?.trim();
    const planId = body.planId?.trim();
    const provider = body.provider;

    if (!adId || !planId || (provider !== 'stripe' && provider !== 'pixgo')) {
      return jsonResponse({ error: 'Informe adId, planId e provider válidos.' }, { status: 400 });
    }

    const ownership = await userOwnsAd(supabase, adId, user.id);
    if (!ownership.ad) {
      return jsonResponse({ error: 'Anúncio não encontrado.' }, { status: 404 });
    }
    if (!ownership.owns) {
      return jsonResponse({ error: 'Você só pode destacar seus próprios anúncios.' }, { status: 403 });
    }

    const { data: plan, error: planError } = await supabase
      .from('featured_plans')
      .select('*')
      .eq('id', planId)
      .eq('active', true)
      .maybeSingle<FeaturedPlan>();

    if (planError) throw planError;
    if (!plan) {
      return jsonResponse({ error: 'Plano de destaque indisponível.' }, { status: 404 });
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
        currency: plan.currency || 'BRL',
      })
      .select('*')
      .single();

    if (paymentError) throw paymentError;

    const siteUrl = getSiteUrl();
    const description = `${plan.name} - ${ownership.ad.title || 'Anúncio Dezzapego'}`;

    if (provider === 'stripe') {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        return jsonResponse({ error: 'STRIPE_SECRET_KEY não configurada.' }, { status: 500 });
      }

      const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' });
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: `${siteUrl}/meus-anuncios?featured=success&payment=${payment.id}`,
        cancel_url: `${siteUrl}/meus-anuncios?featured=cancel&payment=${payment.id}`,
        customer_email: user.email || undefined,
        client_reference_id: payment.id,
        metadata: {
          paymentId: payment.id,
          adId,
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

      const { error: updateError } = await supabase
        .from('featured_payments')
        .update({
          external_id: session.id,
          checkout_url: session.url,
          provider_payload: session,
        })
        .eq('id', payment.id);

      if (updateError) throw updateError;

      return jsonResponse({ provider, paymentId: payment.id, checkoutUrl: session.url });
    }

    const pixgoApiKey = process.env.PIXGO_API_KEY;
    if (!pixgoApiKey) {
      return jsonResponse({ error: 'PIXGO_API_KEY não configurada.' }, { status: 500 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, cpf_cnpj, phone, city, state')
      .eq('id', user.id)
      .maybeSingle();

    const pixgoResponse = await fetch('https://pixgo.org/api/v1/payment/create', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': pixgoApiKey,
      },
      body: JSON.stringify({
        amount: plan.price_cents / 100,
        description,
        external_id: payment.id,
        webhook_url: `${siteUrl}/api/pixgo-webhook`,
        customer_name: profile?.full_name || user.user_metadata?.full_name || user.email || undefined,
        customer_cpf: profile?.cpf_cnpj ? String(profile.cpf_cnpj).replace(/\D/g, '') : undefined,
        customer_email: user.email || undefined,
        customer_phone: profile?.phone || undefined,
        customer_address: [profile?.city, profile?.state].filter(Boolean).join(', ') || undefined,
      }),
    });

    const pixgoPayload = await pixgoResponse.json();
    if (!pixgoResponse.ok || pixgoPayload?.success === false) {
      await supabase
        .from('featured_payments')
        .update({ status: 'failed', provider_payload: pixgoPayload })
        .eq('id', payment.id);

      return jsonResponse(
        { error: pixgoPayload?.message || pixgoPayload?.error || 'Erro ao criar pagamento PixGo.' },
        { status: 502 },
      );
    }

    const pixgoData = pixgoPayload.data || {};
    const { error: updateError } = await supabase
      .from('featured_payments')
      .update({
        external_id: pixgoData.payment_id,
        external_checkout_id: pixgoData.external_id,
        qr_code: pixgoData.qr_code,
        qr_image_url: pixgoData.qr_image_url,
        expires_at: pixgoData.expires_at,
        provider_payload: pixgoPayload,
      })
      .eq('id', payment.id);

    if (updateError) throw updateError;

    return jsonResponse({
      provider,
      paymentId: payment.id,
      pix: {
        paymentId: pixgoData.payment_id,
        qrCode: pixgoData.qr_code,
        qrImageUrl: pixgoData.qr_image_url,
        expiresAt: pixgoData.expires_at,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('create-featured-payment error:', error);
    return jsonResponse({ error: 'Erro ao criar pagamento de destaque.' }, { status: 500 });
  }
}
