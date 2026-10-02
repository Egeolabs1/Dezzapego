import { NextResponse } from 'next/server';
import { getAuthenticatedUser, getSupabaseAdmin } from '@/lib/payments';
import { hasSearchAlertCriteria, normalizeSearchAlertFilters } from '@/lib/searchAlertMatching';

export const runtime = 'nodejs';

function safeSearchUrl(value: unknown) {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dezzapego.com';
    const parsed = new URL(value, siteUrl);
    if (parsed.origin !== new URL(siteUrl).origin) return null;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

async function getUser(req: Request) {
  const admin = getSupabaseAdmin();
  const user = await getAuthenticatedUser(req, admin);
  if (!user.email) throw new Response(JSON.stringify({ error: 'A conta não tem um e-mail disponível.' }), { status: 400 });
  return { admin, user };
}

export async function GET(req: Request) {
  try {
    const { admin, user } = await getUser(req);
    const { data, error } = await admin
      .from('saved_search_alerts')
      .select('id, label, search_url, filters, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ alerts: data || [] });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: 'Não foi possível carregar os alertas.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { admin, user } = await getUser(req);
    const body = await req.json() as { url?: unknown; label?: unknown; filters?: unknown };
    const url = safeSearchUrl(body.url);
    const filters = normalizeSearchAlertFilters(body.filters);
    const label = typeof body.label === 'string' ? body.label.trim().slice(0, 120) : '';
    if (!url || !label || !hasSearchAlertCriteria(filters)) {
      return NextResponse.json({ error: 'Escolha uma busca específica antes de ativar o alerta.' }, { status: 400 });
    }

    const { data: existing } = await admin
      .from('saved_search_alerts')
      .select('id')
      .eq('user_id', user.id)
      .eq('search_url', url)
      .maybeSingle();
    if (!existing) {
      const { count, error: countError } = await admin
        .from('saved_search_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (countError) throw countError;
      if ((count || 0) >= 10) return NextResponse.json({ error: 'Você pode manter até 10 alertas ativos.' }, { status: 409 });
    }

    const { data, error } = await admin
      .from('saved_search_alerts')
      .upsert({
        user_id: user.id,
        email: user.email,
        label,
        search_url: url,
        filters,
        is_active: true,
        last_checked_at: new Date().toISOString(),
        last_error: null,
        attempts: 0,
      }, { onConflict: 'user_id,search_url' })
      .select('id, label, search_url, filters, created_at')
      .single();
    if (error) throw error;
    return NextResponse.json({ alert: data });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: 'Não foi possível ativar o alerta.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { admin, user } = await getUser(req);
    const body = await req.json() as { id?: unknown };
    if (typeof body.id !== 'string') return NextResponse.json({ error: 'Alerta inválido.' }, { status: 400 });
    const { error } = await admin
      .from('saved_search_alerts')
      .delete()
      .eq('id', body.id)
      .eq('user_id', user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: 'Não foi possível remover o alerta.' }, { status: 500 });
  }
}
