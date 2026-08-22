import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function MessageBadge() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let active = true;
    async function load() {
      const { data: conversations } = await supabase.from('marketplace_conversations').select('id').or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
      const ids = (conversations || []).map((row) => row.id);
      if (!ids.length) { if (active) setCount(0); return; }
      const { count: unread } = await supabase.from('marketplace_messages').select('id', { count: 'exact', head: true }).in('conversation_id', ids).neq('sender_id', userId).is('read_at', null);
      if (active) setCount(unread || 0);
    }
    void load();
    const channel = supabase.channel(`message-badge-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_messages' }, () => void load()).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [user]);
  if (!user) return null;
  return <Link href="/mensagens" className="relative flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-blue-600" aria-label={`Mensagens${count ? `, ${count} não lidas` : ''}`}><MessageCircle className="h-5 w-5" /><span>Mensagens</span>{count > 0 && <span className="absolute right-1 top-0 min-w-5 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold text-white">{count > 99 ? '99+' : count}</span>}</Link>;
}
