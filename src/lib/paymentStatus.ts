export type PaymentStatus = 'pending' | 'paid' | 'expired' | 'refunded' | 'failed';
export type PaymentPurpose = 'plano' | 'destaque';

export function isFinalPaymentStatus(status: PaymentStatus | null | undefined) {
    return status === 'paid' || status === 'expired' || status === 'refunded' || status === 'failed';
}

export function paymentStatusMessage(status: PaymentStatus, purpose: PaymentPurpose) {
    const subject = purpose === 'plano' ? 'Seu plano' : 'Seu destaque';

    if (status === 'paid') return `Pagamento confirmado. ${subject} já está ativo.`;
    if (status === 'expired') return 'Este pagamento expirou. Gere um novo PIX para continuar.';
    if (status === 'refunded') return 'Este pagamento foi estornado. Consulte seu histórico de pagamentos.';
    if (status === 'failed') return 'Não foi possível confirmar este pagamento. Gere um novo PIX ou tente outro meio.';
    return 'Aguardando a confirmação do pagamento.';
}
