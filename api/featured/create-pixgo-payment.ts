import { getSiteUrl, jsonResponse, prepareFeaturedPayment } from '../_payments';

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, { status: 405 });
  }

  try {
    const pixgoApiKey = process.env.PIXGO_API_KEY;
    if (!pixgoApiKey) {
      return jsonResponse({ error: 'PIXGO_API_KEY não configurada.' }, { status: 500 });
    }

    const { supabase, user, plan, payment, ad } = await prepareFeaturedPayment(req, 'pixgo');
    const siteUrl = getSiteUrl();

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
        description: `${plan.name} - ${ad.title || 'Anúncio Dezzapego'}`,
        external_id: payment.id,
        webhook_url: `${siteUrl}/api/webhooks/pixgo`,
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
    const { error } = await supabase
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

    if (error) throw error;

    return jsonResponse({
      provider: 'pixgo',
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
    console.error('create-pixgo-payment error:', error);
    return jsonResponse({ error: 'Erro ao criar pagamento PixGo.' }, { status: 500 });
  }
}
