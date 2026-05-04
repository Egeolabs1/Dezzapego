import { useEffect, useRef, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

const POLL_MS = 25_000;

export type AdminPanelBadges = {
    unreadMessages: number;
    pendingVerifications: number;
};

/** Contagens + toasts quando surgem mensagens não lidas ou novas filas de verificação (painel admin). */
export function useAdminPanelAlerts(enabled: boolean, navigate: NavigateFunction): AdminPanelBadges {
    const [badges, setBadges] = useState<AdminPanelBadges>({ unreadMessages: 0, pendingVerifications: 0 });
    const prev = useRef<{ unreadMessages: number; pendingVerifications: number } | null>(null);

    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;
        let intervalId: number;

        async function tick() {
            const { data: isAdmin, error: rpcErr } = await supabase.rpc('is_admin');
            if (cancelled || rpcErr || !isAdmin) return;

            const [cRes, vRes] = await Promise.all([
                supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('read', false),
                supabase
                    .from('profiles')
                    .select('id', { count: 'exact', head: true })
                    .eq('verification_status', 'pending'),
            ]);
            if (cancelled) return;

            const unreadMessages = cRes.count ?? 0;
            const pendingVerifications = vRes.count ?? 0;

            if (prev.current !== null) {
                if (unreadMessages > prev.current.unreadMessages) {
                    toast.info('Nova mensagem de contato', {
                        description: 'Há mensagem nova no formulário Fale conosco.',
                        duration: 12_000,
                        action: {
                            label: 'Abrir',
                            onClick: () => navigate('/admin/mensagens'),
                        },
                    });
                }
                if (pendingVerifications > prev.current.pendingVerifications) {
                    toast.info('Nova solicitação de verificação', {
                        description: 'Um usuário enviou documentos para análise.',
                        duration: 12_000,
                        action: {
                            label: 'Analisar',
                            onClick: () => navigate('/admin/verificacao'),
                        },
                    });
                }
            }

            prev.current = { unreadMessages, pendingVerifications };
            setBadges({ unreadMessages, pendingVerifications });
        }

        void tick();
        intervalId = window.setInterval(() => void tick(), POLL_MS);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [enabled, navigate]);

    return badges;
}
