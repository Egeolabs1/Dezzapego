import { getSupabaseAdmin, jsonResponse } from './_payments';

type TrackVisitBody = {
  path?: string;
  sessionId?: string;
  referrer?: string;
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, { status: 405 });
  }

  try {
    const body = (await req.json()) as TrackVisitBody;
    const path = body.path?.trim().slice(0, 500);
    const sessionId = body.sessionId?.trim().slice(0, 120);

    if (!path || !sessionId) {
      return jsonResponse({ error: 'path e sessionId são obrigatórios.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const tenSecondsAgo = new Date(Date.now() - 10_000).toISOString();
    const { data: duplicateVisit } = await supabase
      .from('site_visits')
      .select('id')
      .eq('session_id', sessionId)
      .eq('path', path)
      .gte('created_at', tenSecondsAgo)
      .maybeSingle();

    if (duplicateVisit) {
      return jsonResponse({ ok: true, deduped: true });
    }

    const { error } = await supabase
      .from('site_visits')
      .insert({
        path,
        session_id: sessionId,
        referrer: body.referrer?.trim().slice(0, 500) || req.headers.get('referer'),
        user_agent: req.headers.get('user-agent'),
      });

    if (error) throw error;

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('track-visit error:', error);
    return jsonResponse({ error: 'Erro ao registrar visita.' }, { status: 500 });
  }
}
