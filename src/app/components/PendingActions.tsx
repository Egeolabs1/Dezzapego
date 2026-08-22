import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Clock3, FileText, WalletCards } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type PendingAction = { title: string; description: string; href: string; icon: typeof AlertCircle; tone: string };

export function PendingActions() {
    const { user } = useAuth();
    const [actions, setActions] = useState<PendingAction[]>([]);

    useEffect(() => {
        if (!user) return;
        const userId = user.id;
        let cancelled = false;

        async function load() {
            const [{ data: pendingAds }, { data: pendingPlans }, { data: pendingFeatured }] = await Promise.all([
                supabase.from('ads').select('id, title').eq('user_id', userId).eq('status', 'pending').limit(3),
                supabase.from('account_plan_payments').select('id, plan_id').eq('user_id', userId).eq('status', 'pending').limit(1),
                supabase.from('featured_payments').select('id, ad_id').eq('user_id', userId).eq('status', 'pending').limit(1),
            ]);

            const next: PendingAction[] = [];
            if (pendingAds?.length) {
                next.push({ title: 'Anúncio aguardando aprovação', description: `${pendingAds[0].title}${pendingAds.length > 1 ? ` e mais ${pendingAds.length - 1}` : ''}`, href: '/meus-anuncios', icon: Clock3, tone: 'border-amber-200 bg-amber-50 text-amber-900' });
            }
            if (pendingPlans?.length) {
                next.push({ title: 'Pagamento de plano pendente', description: 'Confira o pagamento e conclua sua assinatura.', href: `/checkout/plano?plan=${encodeURIComponent(pendingPlans[0].plan_id)}`, icon: WalletCards, tone: 'border-blue-200 bg-blue-50 text-blue-900' });
            }
            if (pendingFeatured?.length) {
                next.push({ title: 'Destaque aguardando pagamento', description: 'Volte aos seus anúncios para acompanhar o PIX.', href: `/anuncio/${pendingFeatured[0].ad_id}`, icon: WalletCards, tone: 'border-blue-200 bg-blue-50 text-blue-900' });
            }

            try {
                const draft = localStorage.getItem(`dezzapego_new_ad_draft_v1:${userId}`);
                if (draft) next.push({ title: 'Você tem um rascunho', description: 'Continue a criação do anúncio de onde parou.', href: '/anunciar', icon: FileText, tone: 'border-purple-200 bg-purple-50 text-purple-900' });
            } catch {
                /* ignore storage failures */
            }
            if (!cancelled) setActions(next);
        }

        void load();
        return () => { cancelled = true; };
    }, [user]);

    if (!actions.length) return null;
    return (
        <section aria-labelledby="pending-actions-title" className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2"><AlertCircle className="h-5 w-5 text-blue-600" /><h2 id="pending-actions-title" className="font-bold text-gray-900">Ações pendentes</h2></div>
            <div className="grid gap-3 md:grid-cols-2">
                {actions.map((action) => {
                    const Icon = action.icon;
                    return <Link key={`${action.title}-${action.href}`} href={action.href} className={`flex items-center gap-3 rounded-lg border p-3 transition hover:shadow-sm ${action.tone}`}><Icon className="h-5 w-5 shrink-0" /><span className="min-w-0 flex-1"><strong className="block text-sm">{action.title}</strong><span className="block truncate text-xs opacity-80">{action.description}</span></span><ArrowRight className="h-4 w-4 shrink-0" /></Link>;
                })}
            </div>
        </section>
    );
}
