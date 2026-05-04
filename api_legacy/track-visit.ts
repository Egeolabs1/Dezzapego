import { createClient } from '@supabase/supabase-js';

type TrackVisitBody = {
  path?: string;
  sessionId?: string;
  referrer?: string;
};

function getSupabaseForAnalytics() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type JsonResponse = {
  status: (code: number) => { json: (body: unknown) => void };
  json: (body: unknown) => void;
};

type ApiRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};

export default async function handler(req: ApiRequest, res: JsonResponse) {
  console.log('[track-visit] Starting request...');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const body = req.body as TrackVisitBody;
    const path = body?.path?.trim().slice(0, 500);
    const sessionId = body?.sessionId?.trim().slice(0, 120);

    if (!path || !sessionId) {
      console.warn('[track-visit] Missing path or sessionId');
      return res.status(400).json({ error: 'path e sessionId são obrigatórios.' });
    }

    let supabase;
    try {
      supabase = getSupabaseForAnalytics();
    } catch (error) {
      console.warn('[track-visit] skipped (missing env):', error);
      return res.status(200).json({ ok: true, skipped: 'missing_env' });
    }

    console.log('[track-visit] Checking for duplicates...');
    const tenSecondsAgo = new Date(Date.now() - 10_000).toISOString();
    
    // Adicionando um timeout manual para a query não travar a função
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database timeout')), 8000)
    );

    const { data: duplicateVisit } = await Promise.race([
      supabase
        .from('site_visits')
        .select('id')
        .eq('session_id', sessionId)
        .eq('path', path)
        .gte('created_at', tenSecondsAgo)
        .maybeSingle(),
      timeoutPromise
    ]) as any;

    if (duplicateVisit) {
      console.log('[track-visit] Duplicate found, deduping.');
      return res.status(200).json({ ok: true, deduped: true });
    }

    console.log('[track-visit] Inserting new visit...');
    const referrerHeader = req.headers.referer;
    const userAgentHeader = req.headers['user-agent'];
    const { error } = await Promise.race([
      supabase
        .from('site_visits')
        .insert({
          path,
          session_id: sessionId,
          referrer: body.referrer?.trim().slice(0, 500) || (typeof referrerHeader === 'string' ? referrerHeader : undefined),
          user_agent: typeof userAgentHeader === 'string' ? userAgentHeader : undefined,
        }),
      timeoutPromise
    ]) as any;

    if (error) throw error;

    console.log('[track-visit] Success.');
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[track-visit] error:', error);
    return res.status(200).json({ ok: true, skipped: 'internal_error' });
  }
}
