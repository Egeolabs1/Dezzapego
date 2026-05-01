import { createClient } from '@supabase/supabase-js';

type TrackVisitBody = {
  path?: string;
  sessionId?: string;
  referrer?: string;
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init?.headers || {}),
    },
  });
}

function getSupabaseForAnalytics() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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

    let supabase;
    try {
      supabase = getSupabaseForAnalytics();
    } catch (error) {
      // Analytics não pode quebrar a experiência do usuário.
      console.warn('track-visit skipped (missing env):', error);
      return jsonResponse({ ok: true, skipped: 'missing_env' });
    }

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
    // Não retornar 500 aqui para evitar ruído no console do cliente.
    return jsonResponse({ ok: true, skipped: 'internal_error' });
  }
}
