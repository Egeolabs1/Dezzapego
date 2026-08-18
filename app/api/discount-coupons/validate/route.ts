import { validateDiscountCoupon, normalizeCouponCode } from '@/lib/discountCoupons';
import { getAuthenticatedUser, getSupabaseAdmin, jsonResponse } from '@/lib/payments';

type RequestBody = {
  code?: string;
  appliesTo?: 'account_plan' | 'featured';
  amountCents?: number;
};

export async function POST(req: Request) {
  try {
    const body = await req.json() as RequestBody;
    if (!body.code || !body.appliesTo) {
      return jsonResponse({ error: 'Cupom e tipo de compra são obrigatórios.' }, { status: 400 });
    }

    // Validate appliesTo
    const validAppliesTo = ['account_plan', 'featured', 'all'];
    if (!validAppliesTo.includes(body.appliesTo)) {
      return jsonResponse({ error: 'Tipo de compra inválido.' }, { status: 400 });
    }

    // Validate UUID format for code
    if (typeof body.code !== 'string' || body.code.length > 100) {
      return jsonResponse({ error: 'Cupom inválido.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    await getAuthenticatedUser(req, supabase);

    const result = await validateDiscountCoupon(
      supabase,
      body.code,
      body.appliesTo,
      Number(body.amountCents || 0),
    );

    if (result.error || !result.coupon) {
      return jsonResponse({ error: result.error || 'Cupom inválido.' }, { status: 400 });
    }

    return jsonResponse({
      coupon: {
        id: result.coupon.id,
        code: normalizeCouponCode(result.coupon.code),
        description: result.coupon.description,
        applies_to: result.coupon.applies_to,
        discount_type: result.coupon.discount_type,
        discount_value: result.coupon.discount_value,
        starts_at: result.coupon.starts_at,
        ends_at: result.coupon.ends_at,
        active: result.coupon.active,
      },
      discountCents: result.discountCents,
      finalAmountCents: result.finalAmountCents,
    });
  } catch (error) {
    console.error('validate discount coupon error:', error);
    return jsonResponse({ error: 'Erro ao validar cupom.' }, { status: 500 });
  }
}
