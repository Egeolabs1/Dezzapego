import { useEffect, useState } from 'react';
import { MessageCircle, Send, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { toast } from 'sonner';

type Conversation = { id: string; ad_id: string; buyer_id: string; seller_id: string; last_message_at: string; ads?: { title?: string } | null; participant?: { name?: string | null; avatar?: string | null; type?: string | null } };
type Message = { id: string; sender_id: string; body: string; created_at: string; read_at?: string | null };

export default function Messages() {
  const { user, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    void loadConversations();
    const channel = supabase.channel(`marketplace-messages-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_messages' }, (payload) => {
      const incoming = payload.new as Message & { conversation_id?: string };
      if (selected?.id === incoming.conversation_id) setMessages((prev) => prev.some((item) => item.id === incoming.id) ? prev : [...prev, incoming]);
      void loadConversations();
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user]);

  async function loadConversations() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.from('marketplace_conversations').select('id, ad_id, buyer_id, seller_id, last_message_at, ads(title)').or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`).order('last_message_at', { ascending: false });
    if (error) toast.error('Não foi possível carregar suas conversas.');
    const rows = (data || []) as unknown as Conversation[];
    const participantIds = rows.map((row) => row.buyer_id === user.id ? row.seller_id : row.buyer_id);
    if (participantIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, account_type').in('id', participantIds);
      const byId = new Map((profiles || []).map((profile) => [profile.id, profile]));
      rows.forEach((row) => { const profile = byId.get(row.buyer_id === user.id ? row.seller_id : row.buyer_id); row.participant = { name: profile?.full_name, avatar: profile?.avatar_url, type: profile?.account_type }; });
    }
    setConversations(rows);
    if (!selected && rows[0]) { setSelected(rows[0]); void loadMessages(rows[0]); }
    setLoading(false);
  }

  async function loadMessages(conversation: Conversation) {
    setSelected(conversation);
    const { data, error } = await supabase.from('marketplace_messages').select('id, sender_id, body, created_at, read_at').eq('conversation_id', conversation.id).order('created_at');
    if (error) toast.error('Não foi possível carregar as mensagens.');
    setMessages((data || []) as Message[]);
    await supabase.from('marketplace_messages').update({ read_at: new Date().toISOString() }).eq('conversation_id', conversation.id).neq('sender_id', user?.id || '').is('read_at', null);
  }

  async function sendMessage() {
    if (!user || !selected || !body.trim()) return;
    setSending(true);
    const text = body.trim();
    const { data: session } = await supabase.auth.getSession();
    const response = await fetch('/api/messages/send', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${session.session?.access_token || ''}` }, body: JSON.stringify({ conversationId: selected.id, message: text }) });
    const result = await response.json() as { message?: Message; error?: string };
    if (!response.ok || !result.message) toast.error(result.error || 'Não foi possível enviar a mensagem.');
    else { setMessages((prev) => [...prev, result.message as Message]); setBody(''); }
    setSending(false);
  }

  if (authLoading || loading) return <><Header /><div className="mx-auto flex max-w-6xl justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div></>;
  if (!user) return <><Header /><div className="mx-auto max-w-6xl p-12 text-center"><MessageCircle className="mx-auto mb-3 h-10 w-10 text-gray-300" /><h1 className="text-xl font-bold">Entre para ver suas mensagens</h1></div></>;

  return <><Header /><main className="mx-auto max-w-6xl px-4 py-8"><div className="mb-6 flex items-center justify-between"><div><h1 className="text-2xl font-bold text-gray-900">Minhas mensagens</h1><p className="mt-1 text-sm text-gray-500">Converse com compradores e anunciantes sem sair do Dezzapego.</p></div><button onClick={() => void loadConversations()} className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50" aria-label="Atualizar conversas"><RefreshCw className="h-4 w-4" /></button></div><div className="grid min-h-[560px] overflow-hidden rounded-xl border border-gray-200 bg-white md:grid-cols-[280px_1fr]">
    <aside className="border-b border-gray-200 md:border-b-0 md:border-r"><div className="border-b p-4 font-semibold">Conversas</div>{conversations.length === 0 ? <div className="p-5 text-center"><MessageCircle className="mx-auto mb-2 h-8 w-8 text-gray-300" /><p className="text-sm text-gray-500">Você ainda não iniciou nenhuma conversa.</p><a href="/" className="mt-3 inline-block text-sm font-semibold text-blue-600 hover:underline">Encontrar anúncios</a></div> : conversations.map((conversation) => <button key={conversation.id} onClick={() => void loadMessages(conversation)} className={`block w-full border-b p-4 text-left hover:bg-gray-50 ${selected?.id === conversation.id ? 'bg-blue-50' : ''}`}><span className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-xs font-bold text-blue-700">{conversation.participant?.avatar ? <img src={conversation.participant.avatar} alt="" className="h-full w-full object-cover" /> : (conversation.participant?.name || '?').charAt(0).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{conversation.participant?.name || 'Usuário'}</span><span className="block truncate text-xs text-gray-500">{conversation.ads?.title || 'Anúncio'} · {conversation.participant?.type || 'Usuário'}</span></span></span></button>)}</aside>
    <section className="flex min-h-[560px] flex-col"><div className="flex items-center justify-between border-b p-4 font-semibold">{selected?.ads?.title || 'Selecione uma conversa'}{selected && <a href={`/anuncio/${selected.ad_id}`} className="text-xs font-medium text-blue-600 hover:underline">Ver anúncio <ExternalLink className="inline h-3 w-3" /></a>}</div>{!selected ? <div className="flex flex-1 items-center justify-center text-gray-500">Escolha uma conversa.</div> : <><div className="flex-1 space-y-3 overflow-y-auto p-4">{messages.length === 0 ? <p className="text-sm text-gray-500">Envie a primeira mensagem.</p> : messages.map((message) => <div key={message.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${message.sender_id === user.id ? 'ml-auto bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}><p className="whitespace-pre-wrap">{message.body}</p><time className="mt-1 block text-[10px] opacity-70">{new Date(message.created_at).toLocaleString('pt-BR')}</time></div>)}</div><form onSubmit={(event) => { event.preventDefault(); void sendMessage(); }} className="flex gap-2 border-t p-3"><input value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} placeholder="Escreva sua mensagem..." className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" /><button disabled={sending || !body.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50" aria-label="Enviar mensagem"><Send className="h-4 w-4" /></button></form></>}</section>
  </div></main></>;
}
