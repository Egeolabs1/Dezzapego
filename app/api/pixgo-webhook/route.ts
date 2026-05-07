import {
  activateAccountPlan,
  activateFeaturedAd,
  getSupabaseAdmin,
  jsonResponse,
  markAccountPlanPaymentStatus,
  markPaymentStatus,
  verifyHmacSha256Signature,
} from '@/lib/payments';

type PixGoWebhookPayload = {
  event?: 'payment.completed' | 'payment.expired' | 'payment.refunded' | string;
  data?: {
    payment_id?: string;
    external_id?: string;
    status?: string;
    amount?: number;
    amounts?: {
      gross?: number;
      net?: number;
      fee_total?: number;
      currency?: string;
    };
  };
};

export async function POST(req: Request) {
  const webhookSecret = process.env.PIXGO_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return jsonResponse({ error: 'PIXGO_WEBHOOK_SECRET não configurado.' }, { status: 500 });
  }

  try {
    const rawBody = await req.text();
    const isValid = verifyHmacSha256Signature(
      rawBody,
      req.headers.get('x-webhook-timestamp'),
      req.headers.get('x-webhook-signature'),
      webhookSecret,
    );

    if (!isValid) {
      return jsonResponse({ error: 'Assinatura PixGo inválida.' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as PixGoWebhookPayload;
    const paymentId = payload.data?.external_id;
    const pixgoPaymentId = payload.data?.payment_id;

    if (!paymentId) {
      return jsonResponse({ error: 'external_id ausente no webhook.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: accountPayment } = await supabase
      .from('account_plan_payments')
      .select('id')
      .eq('id', paymentId)
      .maybeSingle();

    if (accountPayment) {
      await supabase
        .from('account_plan_payments')
        .update({
          external_id: pixgoPaymentId,
          gross_amount_cents: payload.data?.amounts?.gross ? Math.round(payload.data.amounts.gross * 100) : undefined,
          net_amount_cents: payload.data?.amounts?.net ? Math.round(payload.data.amounts.net * 100) : undefined,
          fee_amount_cents: payload.data?.amounts?.fee_total ? Math.round(payload.data.amounts.fee_total * 100) : undefined,
          currency: payload.data?.amounts?.currency || undefined,
          webhook_payload: payload,
        })
        .eq('id', paymentId);

      if (payload.event === 'payment.completed') {
        await activateAccountPlan(supabase, paymentId);
      } else if (payload.event === 'payment.expired') {
        await markAccountPlanPaymentStatus(supabase, paymentId, 'expired', payload);
      } else if (payload.event === 'payment.refunded') {
        await markAccountPlanPaymentStatus(supabase, paymentId, 'refunded', payload);
      }

      return jsonResponse({ received: true });
    }

    await supabase
      .from('featured_payments')
      .update({
        external_id: pixgoPaymentId,
        gross_amount_cents: payload.data?.amounts?.gross ? Math.round(payload.data.amounts.gross * 100) : undefined,
        net_amount_cents: payload.data?.amounts?.net ? Math.round(payload.data.amounts.net * 100) : undefined,
        fee_amount_cents: payload.data?.amounts?.fee_total ? Math.round(payload.data.amounts.fee_total * 100) : undefined,
        currency: payload.data?.amounts?.currency || undefined,
        webhook_payload: payload,
      })
      .eq('id', paymentId);

    if (payload.event === 'payment.completed') {
      await activateFeaturedAd(supabase, paymentId);
    } else if (payload.event === 'payment.expired') {
      await markPaymentStatus(supabase, paymentId, 'expired', payload);
    } else if (payload.event === 'payment.refunded') {
      await markPaymentStatus(supabase, paymentId, 'refunded', payload);
    }

    return jsonResponse({ received: true });
  } catch (error) {
    console.error('pixgo-webhook error:', error);
    return jsonResponse({ error: 'Erro ao processar webhook PixGo.' }, { status: 400 });
  }
}
