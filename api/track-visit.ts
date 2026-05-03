import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

type TrackVisitBody = {
  path?: string;
  sessionId?: string;
  referrer?: string;
};

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const body = req.body as TrackVisitBody;
    const path = body?.path?.trim().slice(0, 500);
    const sessionId = body?.sessionId?.trim().slice(0, 120);

    if (!path || !sessionId) {
      return res.status(400).json({ error: 'path e sessionId são obrigatórios.' });
    }

    let supabase;
    try {
      supabase = getSupabaseForAnalytics();
    } catch (error) {
      console.warn('track-visit skipped (missing env):', error);
      return res.status(200).json({ ok: true, skipped: 'missing_env' });
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
      return res.status(200).json({ ok: true, deduped: true });
    }

    const { error } = await supabase
      .from('site_visits')
      .insert({
        path,
        session_id: sessionId,
        referrer: body.referrer?.trim().slice(0, 500) || (req.headers['referer'] as string),
        user_agent: req.headers['user-agent'] as string,
      });

    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('track-visit error:', error);
    return res.status(200).json({ ok: true, skipped: 'internal_error' });
  }
}
