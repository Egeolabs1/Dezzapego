import type { SupabaseClient } from '@supabase/supabase-js';

export async function enqueuePaymentReminder(
  supabase: SupabaseClient,
  input: { userId: string; email?: string | null; paymentId: string; description: string; amountCents: number; provider: string },
) {
  if (!input.email) return;
  const { data: profile } = await supabase.from('profiles').select('email_reminders_enabled').eq('id', input.userId).maybeSingle();
  if (profile?.email_reminders_enabled === false) return;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const scheduledFor = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const { error } = await supabase.from('email_reminders').upsert({
    user_id: input.userId,
    email: input.email,
    kind: 'payment_pending',
    reference_id: input.paymentId,
    subject: `Pagamento pendente: ${input.description}`,
    scheduled_for: scheduledFor,
    payload: {
      title: 'Seu pagamento está aguardando confirmação',
      body: `<p>Você iniciou ${input.description} no Dezzapego no valor de <strong>R$ ${(input.amountCents / 100).toFixed(2).replace('.', ',')}</strong> usando ${input.provider.toUpperCase()}.</p><p>Se você ainda não concluiu, retome o pagamento para não perder sua configuração.</p>`,
      actionLabel: 'Retomar pagamento',
      actionHref: `${siteUrl}/dashboard`,
    },
  }, { onConflict: 'user_id,kind,reference_id', ignoreDuplicates: true });
  if (error) console.error('email reminder enqueue error:', error.message);
}

export async function enqueuePaymentStatusEmail(
  supabase: SupabaseClient,
  input: { userId: string; paymentId: string; status: 'paid' | 'expired' | 'refunded'; description: string },
) {
  const { data: profile } = await supabase.from('profiles').select('email, email_reminders_enabled').eq('id', input.userId).maybeSingle();
  if (!profile?.email || profile.email_reminders_enabled === false) return;
  const labels = { paid: 'Pagamento confirmado', expired: 'Pagamento expirado', refunded: 'Pagamento reembolsado' };
  const body = input.status === 'paid'
    ? `<p>Seu pagamento de <strong>${input.description}</strong> foi confirmado.</p>`
    : `<p>O pagamento de <strong>${input.description}</strong> foi ${input.status === 'expired' ? 'expirado' : 'reembolsado'}.</p>`;
  await supabase.from('email_reminders').upsert({
    user_id: input.userId,
    email: profile.email,
    kind: `payment_${input.status}`,
    reference_id: input.paymentId,
    subject: `${labels[input.status]} | Dezzapego`,
    payload: { title: labels[input.status], body, actionLabel: 'Acessar minha conta', actionHref: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard` },
    scheduled_for: new Date().toISOString(),
  }, { onConflict: 'user_id,kind,reference_id', ignoreDuplicates: true });
}

export async function enqueueAdStatusEmail(supabase: SupabaseClient, input: { userId: string; adId: string; title: string; status: 'active' | 'rejected' }) {
  const { data: profile } = await supabase.from('profiles').select('email, email_reminders_enabled').eq('id', input.userId).maybeSingle();
  if (!profile?.email || profile.email_reminders_enabled === false) return;
  const approved = input.status === 'active';
  await supabase.from('email_reminders').upsert({
    user_id: input.userId,
    email: profile.email,
    kind: 'ad_moderation',
    reference_id: input.adId,
    subject: `${approved ? 'Anúncio aprovado' : 'Ajustes necessários no anúncio'} | Dezzapego`,
    payload: {
      title: approved ? 'Seu anúncio foi aprovado' : 'Seu anúncio precisa de ajustes',
      body: `<p>O anúncio <strong>${input.title}</strong> foi ${approved ? 'aprovado e já está visível para compradores' : 'rejeitado pela moderação. Revise as informações e envie novamente'}.</p>`,
      actionLabel: approved ? 'Ver meus anúncios' : 'Corrigir anúncio',
      actionHref: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/meus-anuncios`,
    },
    scheduled_for: new Date().toISOString(),
  }, { onConflict: 'user_id,kind,reference_id', ignoreDuplicates: true });
}
