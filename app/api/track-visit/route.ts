import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Simple in-memory rate limiter (resets on cold start)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) || [];
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return true;
  recent.push(now);
  rateLimitMap.set(key, recent);
  return false;
}

function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function getSupabaseForAnalytics() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: Request) {
  try {
    // Rate limiting by IP
    const clientIp = getClientIp(request);
    if (isRateLimited(clientIp)) {
      return NextResponse.json({ ok: true, skipped: 'rate_limited' });
    }

    const body = await request.json();
    const path = body?.path?.trim().slice(0, 500);
    const sessionId = body?.sessionId?.trim().slice(0, 120);

    if (!path || !sessionId) {
      return NextResponse.json({ error: 'path e sessionId são obrigatórios.' }, { status: 400 });
    }

    let supabase;
    try {
      supabase = getSupabaseForAnalytics();
    } catch {
      return NextResponse.json({ ok: true, skipped: 'missing_env' });
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
      return NextResponse.json({ ok: true, deduped: true });
    }

    const referrerHeader = request.headers.get('referer');
    const userAgentHeader = request.headers.get('user-agent');

    const { error } = await supabase
      .from('site_visits')
      .insert({
        path,
        session_id: sessionId,
        referrer: body.referrer?.trim().slice(0, 500) || referrerHeader || undefined,
        user_agent: userAgentHeader || undefined,
      });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[track-visit] error:', error);
    return NextResponse.json({ ok: true, skipped: 'internal_error' });
  }
}
