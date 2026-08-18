import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/payments';
import { createClient } from '@supabase/supabase-js';

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { adminEmail: user.email, supabase: getSupabaseAdmin() };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;
    const { adminEmail, supabase } = auth;

    const body = await request.json();
    const { action, details } = body;

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    const ip = getClientIp(request);

    const { error } = await supabase.from('audit_logs').insert({
      admin_email: adminEmail,
      action,
      details: details || null,
      ip_address: ip,
    });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/log] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
