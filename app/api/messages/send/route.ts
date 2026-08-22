import { NextResponse } from 'next/server';
import { getAuthenticatedUser, getSupabaseAdmin } from '@/lib/payments';

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const user = await getAuthenticatedUser(req, supabase);
    const body = await req.json() as { conversationId?: string; message?: string };
    const text = body.message?.trim();
    if (!body.conversationId || !text || text.length > 4000) return NextResponse.json({ error: 'Mensagem inválida.' }, { status: 400 });
    const { data: conversation } = await supabase.from('marketplace_conversations').select('id, buyer_id, seller_id').eq('id', body.conversationId).or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`).maybeSingle();
    if (!conversation) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 });
    const { data: message, error } = await supabase.from('marketplace_messages').insert({ conversation_id: conversation.id, sender_id: user.id, body: text }).select('id, sender_id, body, created_at, read_at').single();
    if (error) throw error;
    const recipientId = conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;
    await supabase.from('notifications').insert({ user_id: recipientId, title: 'Nova mensagem', message: text.slice(0, 140), type: 'message', read: false });
    await supabase.from('marketplace_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation.id);
    return NextResponse.json({ message });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: 'Não foi possível enviar a mensagem.' }, { status: 500 });
  }
}
