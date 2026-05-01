import { supabase } from './supabase';

export type FeaturedProvider = 'stripe' | 'pixgo';

export type FeaturedPlan = {
    id: string;
    name: string;
    duration_days: number;
    price_cents: number;
    currency: string;
    active: boolean;
    sort_order: number;
};

export type FeaturedPayment = {
    id: string;
    ad_id: string;
    user_id: string;
    plan_id: string;
    provider: FeaturedProvider;
    status: 'pending' | 'paid' | 'expired' | 'refunded' | 'failed';
    amount_cents: number;
    gross_amount_cents?: number;
    net_amount_cents?: number;
    fee_amount_cents?: number;
    currency: string;
    external_id?: string | null;
    external_checkout_id?: string | null;
    checkout_url: string | null;
    qr_code: string | null;
    qr_image_url: string | null;
    provider_payload?: unknown;
    webhook_payload?: unknown;
    paid_at: string | null;
    expires_at: string | null;
    created_at: string;
    featured_plans?: Pick<FeaturedPlan, 'name' | 'duration_days'> | null;
};

export type CreateFeaturedPaymentResult = {
    provider: FeaturedProvider;
    paymentId: string;
    checkoutUrl?: string | null;
    pix?: {
        paymentId?: string;
        qrCode?: string;
        qrImageUrl?: string;
        expiresAt?: string;
    };
};

export function formatCents(cents: number, currency = 'BRL') {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency,
    }).format((Number(cents) || 0) / 100);
}

export async function createFeaturedPayment(adId: string, planId: string, provider: FeaturedProvider) {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error('Faça login para destacar o anúncio.');

    const endpoint = provider === 'stripe'
        ? '/api/featured/create-stripe-checkout'
        : '/api/featured/create-pixgo-payment';

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ adId, planId }),
    });

    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao iniciar pagamento.');
    }

    return payload as CreateFeaturedPaymentResult;
}
