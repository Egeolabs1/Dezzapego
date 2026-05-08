import { supabase } from './supabase';
import { FeaturedProvider } from './featuredPayments';

export type AccountPlanPaymentResult = {
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

export async function createAccountPlanPayment(planId: string, provider: FeaturedProvider, couponCode?: string) {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error('Faça login para assinar um plano.');

    const endpoint = provider === 'stripe'
        ? '/api/account-plans/create-stripe-checkout'
        : '/api/account-plans/create-pixgo-payment';

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ planId, couponCode }),
    });

    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao iniciar pagamento do plano.');
    }

    return payload as AccountPlanPaymentResult;
}
