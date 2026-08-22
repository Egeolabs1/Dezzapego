import { NextResponse } from 'next/server';
import { emailLayout, isEmailConfigured, sendTransactionalEmail } from '@/lib/resend';
import { getSupabaseAdmin } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers.get('authorization') === `Bearer ${secret}`);
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (!isEmailConfigured()) return NextResponse.json({ skipped: true, reason: 'Resend não configurado.' });

  const supabase = getSupabaseAdmin();
  // Cria lembrete uma vez por rascunho antigo; a chave única evita duplicidade.
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: oldDrafts } = await supabase.from('ad_drafts').select('user_id, updated_at').lt('updated_at', cutoff).limit(100);
  for (const draft of oldDrafts || []) {
    const { data: authUser } = await supabase.auth.admin.getUserById(draft.user_id);
    if (authUser.user?.email) await supabase.from('email_reminders').upsert({ user_id: draft.user_id, email: authUser.user.email, kind: 'draft_reminder', reference_id: draft.user_id, subject: 'Você tem um anúncio para terminar | Dezzapego', scheduled_for: new Date().toISOString(), payload: { title: 'Seu anúncio está quase pronto', body: '<p>Você deixou um anúncio salvo. Continue de onde parou e publique quando estiver pronto.</p>', actionLabel: 'Continuar anúncio', actionHref: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/anunciar` } }, { onConflict: 'user_id,kind,reference_id', ignoreDuplicates: true });
  }
  const { data: reminders, error } = await supabase
    .from('email_reminders')
    .select('id, email, subject, kind, payload')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .lt('attempts', 3)
    .order('scheduled_for')
    .limit(25);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const reminder of reminders || []) {
    const payload = (reminder.payload || {}) as { title?: string; body?: string; actionLabel?: string; actionHref?: string };
    try {
      await sendTransactionalEmail({
        to: reminder.email,
        subject: reminder.subject,
        html: emailLayout(payload.title || reminder.subject, payload.body || '', payload.actionLabel && payload.actionHref ? { label: payload.actionLabel, href: payload.actionHref } : undefined),
      });
      await supabase.from('email_reminders').update({ status: 'sent', sent_at: new Date().toISOString(), attempts: 1 }).eq('id', reminder.id);
      sent += 1;
    } catch (sendError) {
      const { data: current } = await supabase.from('email_reminders').select('attempts').eq('id', reminder.id).maybeSingle();
      const attempts = Number(current?.attempts || 0) + 1;
      await supabase.from('email_reminders').update({ status: attempts >= 3 ? 'failed' : 'pending', attempts, scheduled_for: new Date(Date.now() + Math.min(60, 5 * attempts) * 60 * 1000).toISOString(), last_error: sendError instanceof Error ? sendError.message : 'Falha ao enviar' }).eq('id', reminder.id);
    }
  }
  return NextResponse.json({ processed: reminders?.length || 0, sent });
}
