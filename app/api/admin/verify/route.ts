import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/payments';
import { createClient } from '@supabase/supabase-js';

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
  return { supabase: getSupabaseAdmin() };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;
    const { supabase } = auth;

    const body = await request.json();
    const { user_id, action, reason } = body;

    if (!user_id || !action) {
      return NextResponse.json({ error: 'user_id and action are required' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (action === 'approve') {
      const { error } = await supabase
        .from('profiles')
        .update({
          verified: true,
          verification_status: 'verified',
          verification_rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user_id);
      if (error) throw error;
    } else {
      const msg = reason?.trim() || 'Documentação não aprovada. Envie fotos mais nítidas.';
      const { error } = await supabase
        .from('profiles')
        .update({
          verified: false,
          verification_status: 'rejected',
          verification_rejection_reason: msg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user_id);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/verify] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
