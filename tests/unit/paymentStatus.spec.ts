import { describe, expect, it } from 'vitest';
import { isFinalPaymentStatus, paymentStatusMessage } from '../../src/lib/paymentStatus';

describe('payment status helpers', () => {
  it('keeps pending payments eligible for status checks', () => {
    expect(isFinalPaymentStatus('pending')).toBe(false);
  });

  it('returns a clear confirmation message for approved payments', () => {
    expect(paymentStatusMessage('paid', 'plano')).toBe('Pagamento confirmado. Seu plano já está ativo.');
  });

  it('returns a retry message for expired payments', () => {
    expect(paymentStatusMessage('expired', 'destaque')).toContain('expirou');
  });
});
