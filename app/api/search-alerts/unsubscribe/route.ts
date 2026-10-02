import { getSupabaseAdmin } from '@/lib/payments';

export const runtime = 'nodejs';

function page(title: string, message: string, token = '') {
  const escapedToken = token.replace(/[^a-f0-9-]/gi, '');
  const form = escapedToken
    ? `<form method="post"><input type="hidden" name="token" value="${escapedToken}"><button type="submit">Desativar alerta</button></form>`
    : '';
  return new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Dezzapego</title><body style="font:16px Arial,sans-serif;color:#172033;max-width:560px;margin:12vh auto;padding:24px"><h1>${title}</h1><p>${message}</p>${form}<p><a href="/">Voltar ao Dezzapego</a></p></body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') || '';
  if (!/^[0-9a-f-]{36}$/i.test(token)) return page('Link inválido', 'Este link de cancelamento não é válido.');
  try {
    const { data } = await getSupabaseAdmin()
      .from('saved_search_alerts')
      .select('id, is_active')
      .eq('unsubscribe_token', token)
      .maybeSingle();
    if (!data || !data.is_active) return page('Alerta já desativado', 'Este alerta de busca não está mais ativo.');
    return page('Cancelar alerta por e-mail', 'Confirme para deixar de receber novos anúncios desta busca.', token);
  } catch {
    return page('Não foi possível carregar', 'Tente novamente mais tarde.');
  }
}

export async function POST(req: Request) {
  const form = await req.formData();
  const token = String(form.get('token') || '');
  if (!/^[0-9a-f-]{36}$/i.test(token)) return page('Link inválido', 'Este link de cancelamento não é válido.');
  try {
    const { error } = await getSupabaseAdmin()
      .from('saved_search_alerts')
      .delete()
      .eq('unsubscribe_token', token);
    if (error) throw error;
    return page('Alerta desativado', 'Você não receberá mais e-mails desta busca.');
  } catch {
    return page('Não foi possível cancelar', 'Tente novamente mais tarde.');
  }
}
