import { NextResponse } from 'next/server';
import { enqueueAdStatusEmail } from '@/lib/emailReminders';
import { getAuthenticatedUser, getSupabaseAdmin } from '@/lib/payments';

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const user = await getAuthenticatedUser(req, supabase);
    const { data: admin } = await supabase.from('profiles').select('is_admin, role').eq('id', user.id).maybeSingle();
    if (!admin?.is_admin && admin?.role !== 'admin') return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    const body = await req.json() as { userId?: string; adId?: string; title?: string; status?: 'active' | 'rejected' };
    if (!body.userId || !body.adId || !body.title || !body.status) return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    await enqueueAdStatusEmail(supabase, { userId: body.userId, adId: body.adId, title: body.title, status: body.status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: 'Não foi possível agendar o e-mail.' }, { status: 500 });
  }
}
