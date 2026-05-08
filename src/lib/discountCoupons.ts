export type CouponAppliesTo = 'account_plan' | 'featured' | 'all';

export type DiscountCoupon = {
    id: string;
    code: string;
    description: string | null;
    applies_to: CouponAppliesTo;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    max_uses: number | null;
    used_count: number;
    starts_at: string | null;
    ends_at: string | null;
    active: boolean;
    created_at?: string;
    updated_at?: string;
};

type CouponValidationResult = {
    coupon: DiscountCoupon | null;
    discountCents: number;
    finalAmountCents: number;
    error?: string;
};

export function normalizeCouponCode(code?: string | null) {
    return String(code || '').trim().toUpperCase();
}

export function calculateCouponDiscount(coupon: Pick<DiscountCoupon, 'discount_type' | 'discount_value'>, amountCents: number) {
    const baseAmount = Math.max(0, Math.round(Number(amountCents) || 0));
    const value = Math.max(0, Number(coupon.discount_value) || 0);

    if (coupon.discount_type === 'percent') {
        return Math.min(baseAmount, Math.round(baseAmount * Math.min(value, 100) / 100));
    }

    return Math.min(baseAmount, Math.round(value));
}

export async function validateDiscountCoupon(
    supabase: any,
    code: string | undefined,
    appliesTo: CouponAppliesTo,
    amountCents: number
): Promise<CouponValidationResult> {
    const normalizedCode = normalizeCouponCode(code);
    const finalAmountWithoutCoupon = Math.max(0, Math.round(Number(amountCents) || 0));

    if (!normalizedCode) {
        return {
            coupon: null,
            discountCents: 0,
            finalAmountCents: finalAmountWithoutCoupon,
        };
    }

    const { data: coupon, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .eq('code', normalizedCode)
        .maybeSingle();

    if (error) throw error;
    if (!coupon) {
        return { coupon: null, discountCents: 0, finalAmountCents: finalAmountWithoutCoupon, error: 'Cupom não encontrado.' };
    }

    if (!coupon.active) {
        return { coupon, discountCents: 0, finalAmountCents: finalAmountWithoutCoupon, error: 'Cupom inativo.' };
    }

    if (coupon.applies_to !== 'all' && coupon.applies_to !== appliesTo) {
        return { coupon, discountCents: 0, finalAmountCents: finalAmountWithoutCoupon, error: 'Cupom não é válido para este tipo de compra.' };
    }

    const now = new Date();
    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
        return { coupon, discountCents: 0, finalAmountCents: finalAmountWithoutCoupon, error: 'Cupom ainda não está disponível.' };
    }

    if (coupon.ends_at && new Date(coupon.ends_at) < now) {
        return { coupon, discountCents: 0, finalAmountCents: finalAmountWithoutCoupon, error: 'Cupom expirado.' };
    }

    if (coupon.max_uses !== null && Number(coupon.used_count || 0) >= Number(coupon.max_uses)) {
        return { coupon, discountCents: 0, finalAmountCents: finalAmountWithoutCoupon, error: 'Cupom esgotado.' };
    }

    const discountCents = calculateCouponDiscount(coupon, finalAmountWithoutCoupon);
    return {
        coupon,
        discountCents,
        finalAmountCents: Math.max(0, finalAmountWithoutCoupon - discountCents),
    };
}
