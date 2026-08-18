import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Suggestion {
    id?: string;
    title: string;
    type: 'ad' | 'category';
}

export function SearchAutocomplete({ query, onSelect }: { query: string; onSelect: (val: string) => void }) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isVisible, setIsVisible] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (query.length < 2) {
            setSuggestions([]);
            setIsVisible(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                // Get ads matching title
                const { data: ads } = await supabase
                    .from('ads')
                    .select('id, title, category')
                    .eq('status', 'active')
                    .ilike('title', `%${query}%`)
                    .limit(5);

                const adSuggestions: Suggestion[] = (ads || []).map(ad => ({
                    id: ad.id,
                    title: ad.title,
                    type: 'ad'
                }));

                // Extract unique categories from matches
                const categorySuggestions: Suggestion[] = Array.from(
                    new Set((ads || []).map(ad => ad.category))
                ).map(cat => ({
                    title: cat,
                    type: 'category'
                }));

                // Prioritize exact or start matches for categories if query is short
                const all = [...adSuggestions, ...categorySuggestions].slice(0, 8);
                setSuggestions(all);
                setIsVisible(all.length > 0);
            } catch (err) {
                console.error('Autocomplete error:', err);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [query]);

    // Handle clicks outside
    useEffect(() => {
        const handleClick = () => setIsVisible(false);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    if (!isVisible || suggestions.length === 0) return null;

    return (
        <div 
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="p-2">
                <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Sugestões
                </div>
                {suggestions.map((s, i) => (
                    <button
                        key={i}
                        onClick={() => {
                            setIsVisible(false);
                            if (s.type === 'ad' && s.id) {
                                router.push(`/anuncio/${s.id}`);
                            } else {
                                onSelect(s.title);
                            }
                        }}
                        className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-all text-left group"
                    >
                        <div className={`p-2 rounded-lg ${s.type === 'ad' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                            {s.type === 'ad' ? <Search className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                                {s.title}
                            </p>
                            <p className="text-[10px] text-gray-400 font-medium">
                                {s.type === 'ad' ? 'Ver anúncio' : `Em categoria: ${s.title}`}
                            </p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
