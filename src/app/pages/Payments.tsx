import { useEffect, useState } from 'react';
import { CreditCard, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';

type Payment = { id: string; amount_cents: number; status: string; provider: string; created_at: string; plan_id?: string; ad_id?: string };
const labels: Record<string, string> = { pending: 'Aguardando pagamento', paid: 'Confirmado', expired: 'Expirado', refunded: 'Reembolsado', failed: 'Falhou' };
export default function Payments() {
  const { user, loading: authLoading } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() {
    if (!user) return;
    setLoading(true);
    const [{ data: plans }, { data: featured }] = await Promise.all([
      supabase.from('account_plan_payments').select('id, amount_cents, status, provider, created_at, plan_id').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('featured_payments').select('id, amount_cents, status, provider, created_at, plan_id, ad_id').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    setPayments(([...(plans || []), ...(featured || [])] as Payment[]).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)));
    setLoading(false);
  }
  useEffect(() => { void load(); }, [user]);
  if (authLoading || loading) return <><Header /><div className="mx-auto flex max-w-5xl justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div></>;
  if (!user) return <><Header /><main className="mx-auto max-w-5xl p-12 text-center">Entre para consultar seus pagamentos.</main></>;
  return <><Header /><main className="mx-auto max-w-5xl px-4 py-8"><div className="mb-6 flex items-center justify-between"><div><h1 className="text-2xl font-bold text-gray-900">Meus pagamentos</h1><p className="text-sm text-gray-500">Acompanhe assinaturas e destaques em um só lugar.</p></div><button onClick={() => void load()} aria-label="Atualizar pagamentos" className="rounded-lg border p-2 hover:bg-gray-50"><RefreshCw className="h-4 w-4" /></button></div>{payments.length === 0 ? <div className="rounded-xl border bg-white p-12 text-center"><CreditCard className="mx-auto mb-3 h-10 w-10 text-gray-300" /><p className="text-gray-600">Nenhum pagamento encontrado.</p><a href="/planos" className="mt-3 inline-block font-semibold text-blue-600">Ver planos</a></div> : <div className="overflow-hidden rounded-xl border bg-white"><div className="divide-y">{payments.map((payment) => <div key={payment.id} className="flex flex-wrap items-center justify-between gap-4 p-4"><div><p className="font-semibold text-gray-900">{payment.ad_id ? 'Destaque de anúncio' : 'Plano de conta'}</p><p className="text-xs text-gray-500">{payment.provider.toUpperCase()} · {new Date(payment.created_at).toLocaleString('pt-BR')}</p></div><div className="text-right"><p className="font-bold text-gray-900">R$ {(payment.amount_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p><span className={`text-xs font-semibold ${payment.status === 'paid' ? 'text-green-600' : payment.status === 'pending' ? 'text-amber-600' : 'text-gray-500'}`}>{labels[payment.status] || payment.status}</span></div></div>)}</div></div>}</main></>;
}
