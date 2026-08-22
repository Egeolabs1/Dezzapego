import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { isFinalPaymentStatus, type PaymentStatus } from '../../lib/paymentStatus';

type PaymentTable = 'account_plan_payments' | 'featured_payments';

type PaymentRecord = {
    status: PaymentStatus;
    expires_at: string | null;
};

export function usePaymentStatusPoll(table: PaymentTable, paymentId: string | null, intervalMs = 4000) {
    const [payment, setPayment] = useState<PaymentRecord | null>(null);

    useEffect(() => {
        if (!paymentId) {
            setPayment(null);
            return;
        }

        let cancelled = false;
        let timer: number | undefined;

        const fetchStatus = async () => {
            const { data } = await supabase
                .from(table)
                .select('status, expires_at')
                .eq('id', paymentId)
                .maybeSingle();

            if (cancelled || !data) return;

            const next = data as PaymentRecord;
            setPayment(next);
            if (!isFinalPaymentStatus(next.status)) {
                timer = window.setTimeout(fetchStatus, intervalMs);
            }
        };

        void fetchStatus();
        return () => {
            cancelled = true;
            if (timer) window.clearTimeout(timer);
        };
    }, [intervalMs, paymentId, table]);

    return payment;
}
