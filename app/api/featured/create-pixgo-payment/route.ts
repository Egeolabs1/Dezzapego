import { getAuthenticatedUser, getSiteUrl, getSupabaseAdmin, jsonResponse, userOwnsAd } from '@/lib/payments';

type RequestBody = {
  adId?: string;
  planId?: string;
};

type PixGoCreatePaymentResponse = {
  success?: boolean;
  data?: {
    payment_id?: string;
    qr_code?: string;
    qr_image_url?: string;
    expires_at?: string;
  };
  message?: string;
  error?: string;
};

export async function POST(req: Request) {
  const pixgoApiKey = process.env.PIXGO_API_KEY;
  if (!pixgoApiKey) {
    return jsonResponse({ error: 'PIXGO_API_KEY não configurado.' }, { status: 500 });
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

    const [{ data: plan, error: planError }, { data: profile }] = await Promise.all([
      supabase
        .from('featured_plans')
        .select('*')
        .eq('id', body.planId)
        .eq('active', true)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('full_name, cpf_cnpj, email, phone')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    if (planError) throw planError;
    if (!plan) return jsonResponse({ error: 'Plano de destaque não encontrado.' }, { status: 404 });

    const { data: payment, error: paymentError } = await supabase
      .from('featured_payments')
      .insert({
        ad_id: body.adId,
        user_id: user.id,
        plan_id: plan.id,
        provider: 'pixgo',
        status: 'pending',
        amount_cents: plan.price_cents,
        gross_amount_cents: plan.price_cents,
        currency: plan.currency || 'BRL',
      })
      .select('id')
      .single();

    if (paymentError) throw paymentError;

    const response = await fetch('https://pixgo.org/api/v1/payment/create', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-API-Key': pixgoApiKey,
      },
      body: JSON.stringify({
        amount: Number(plan.price_cents) / 100,
        description: `Dezzapego ${plan.name}`,
        customer_name: profile?.full_name || user.email || 'Cliente Dezzapego',
        customer_cpf: profile?.cpf_cnpj || undefined,
        customer_email: profile?.email || user.email || undefined,
        customer_phone: profile?.phone || undefined,
        external_id: payment.id,
        webhook_url: `${getSiteUrl()}/api/pixgo-webhook`,
      }),
    });

    const pixgo = await response.json() as PixGoCreatePaymentResponse;
    if (!response.ok || !pixgo.success || !pixgo.data) {
      return jsonResponse({ error: pixgo.message || pixgo.error || 'Erro ao gerar PIX.' }, { status: 400 });
    }

    await supabase
      .from('featured_payments')
      .update({
        external_id: pixgo.data.payment_id,
        qr_code: pixgo.data.qr_code,
        qr_image_url: pixgo.data.qr_image_url,
        provider_payload: pixgo,
      })
      .eq('id', payment.id);

    return jsonResponse({
      provider: 'pixgo',
      paymentId: payment.id,
      pix: {
        paymentId: pixgo.data.payment_id,
        qrCode: pixgo.data.qr_code,
        qrImageUrl: pixgo.data.qr_image_url,
        expiresAt: pixgo.data.expires_at,
      },
    });
  } catch (error) {
    console.error('create featured pixgo payment error:', error);
    return jsonResponse({ error: 'Erro ao gerar pagamento PixGo.' }, { status: 400 });
  }
}
