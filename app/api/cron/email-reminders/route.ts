import { NextResponse } from 'next/server';
import { emailLayout, isEmailConfigured, sendTransactionalEmail } from '@/lib/resend';
import { getSiteUrl, getSupabaseAdmin } from '@/lib/payments';
import { matchesSearchAlert, normalizeSearchAlertFilters } from '@/lib/searchAlertMatching';

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

  const scanCutoff = new Date().toISOString();
  const { data: alerts, error: alertError } = await supabase
    .from('saved_search_alerts')
    .select('id, user_id, email, label, search_url, filters, unsubscribe_token, last_checked_at, attempts')
    .eq('is_active', true)
    .lt('attempts', 5)
    .lte('last_checked_at', scanCutoff)
    .order('last_checked_at')
    .limit(50);
  if (alertError) return NextResponse.json({ error: alertError.message }, { status: 500 });

  let alertsSent = 0;
  for (const alert of alerts || []) {
    const { data: profile } = await supabase.from('profiles').select('email_reminders_enabled, account_type').eq('id', alert.user_id).maybeSingle();
    if (profile?.email_reminders_enabled === false) {
      await supabase.from('saved_search_alerts').update({ last_checked_at: scanCutoff }).eq('id', alert.id);
      continue;
    }

    const { data: ads, error: adsError } = await supabase
      .from('ads')
      .select('*')
      .eq('status', 'active')
      .gt('created_at', alert.last_checked_at)
      .lte('created_at', scanCutoff)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (adsError) {
      await supabase.from('saved_search_alerts').update({ attempts: Number(alert.attempts || 0) + 1, last_error: adsError.message }).eq('id', alert.id);
      continue;
    }

    const candidates = ads || [];
    const ownerIds = [...new Set(candidates.map((ad: any) => ad.user_id).filter(Boolean))];
    const { data: profiles } = ownerIds.length
      ? await supabase.from('profiles').select('id, account_type').in('id', ownerIds)
      : { data: [] };
    const accountTypes = new Map((profiles || []).map((item: any) => [item.id, item.account_type]));
    const filters = normalizeSearchAlertFilters(alert.filters);
    const matches = candidates.filter((ad: any) => matchesSearchAlert({
      ...ad,
      seller: { type: accountTypes.get(ad.user_id) || '' },
    }, filters)).slice(0, 5);

    if (!matches.length) {
      await supabase.from('saved_search_alerts').update({ last_checked_at: scanCutoff, attempts: 0, last_error: null }).eq('id', alert.id);
      continue;
    }

    const siteUrl = getSiteUrl();
    const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
    const adLinks = matches.map((ad: any) => `<li style="margin:0 0 14px"><a href="${siteUrl}/anuncio/${encodeURIComponent(ad.id)}" style="color:#1d4ed8;font-weight:700">${escapeHtml(ad.title)}</a>${Number(ad.price) > 0 ? ` · R$ ${Number(ad.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}</li>`).join('');
    const unsubscribeUrl = `${siteUrl}/api/search-alerts/unsubscribe?token=${encodeURIComponent(alert.unsubscribe_token)}`;
    try {
      await sendTransactionalEmail({
        to: alert.email,
        subject: `Novos anúncios para: ${alert.label}`,
        html: emailLayout(`Novos anúncios para sua busca`, `<p>Encontramos ${matches.length === 1 ? 'um anúncio' : `${matches.length} anúncios`} em <strong>${escapeHtml(alert.label)}</strong>:</p><ul>${adLinks}</ul><p><a href="${siteUrl}${alert.search_url}">Ver todos os resultados</a></p><p style="font-size:12px;color:#6b7280">Você ativou este alerta no Dezzapego. <a href="${unsubscribeUrl}">Cancelar este alerta</a>.</p>`),
      });
      await supabase.from('saved_search_alerts').update({ last_checked_at: scanCutoff, last_notified_at: scanCutoff, attempts: 0, last_error: null }).eq('id', alert.id);
      alertsSent += 1;
    } catch (sendError) {
      const attempts = Number(alert.attempts || 0) + 1;
      await supabase.from('saved_search_alerts').update({ attempts, last_error: sendError instanceof Error ? sendError.message.slice(0, 500) : 'Falha ao enviar' }).eq('id', alert.id);
    }
  }
  return NextResponse.json({ processed: reminders?.length || 0, sent, searchAlertsProcessed: alerts?.length || 0, searchAlertsSent: alertsSent });
}
