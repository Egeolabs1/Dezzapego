import { Search, PlusCircle, User, Heart, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export function MobileNav() {
    const pathname = usePathname();
    const { user } = useAuth();

    const isActive = (path: string) => pathname === path;

    const focusSearch = () => {
        try {
            sessionStorage.setItem('dezzapego_focus_search', 'true');
            window.dispatchEvent(new Event('dezzapego-focus-search'));
        } catch {
            /* ignore */
        }
    };

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            <div className="mx-auto grid max-w-sm grid-cols-5 items-center">
                <Link href="/" onClick={focusSearch} aria-label="Buscar anúncios" className={`flex min-h-11 flex-col items-center justify-center gap-1 ${isActive('/') ? 'text-blue-600' : 'text-gray-500'}`}>
                    <Search className="w-6 h-6" />
                    <span className="text-[11px] font-medium">Buscar</span>
                </Link>

                <Link href="/favoritos" aria-label="Favoritos" className={`flex min-h-11 flex-col items-center justify-center gap-1 ${isActive('/favoritos') ? 'text-blue-600' : 'text-gray-500'}`}>
                    <Heart className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Favoritos</span>
                </Link>
                <Link href="/mensagens" aria-label="Mensagens" className={`flex min-h-11 flex-col items-center justify-center gap-1 ${isActive('/mensagens') ? 'text-blue-600' : 'text-gray-500'}`}>
                    <MessageCircle className="h-5 w-5" /><span className="text-[10px]">Mensagens</span>
                </Link>

                <Link href="/anunciar" aria-label="Anunciar">
                    <div className="flex flex-col items-center -mt-6">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg text-white mb-1 transform active:scale-95 transition-transform">
                            <PlusCircle className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-medium text-gray-600">Anunciar</span>
                    </div>
                </Link>

                {user ? (
                    <Link href="/dashboard" aria-label="Perfil" className={`flex min-h-11 flex-col items-center justify-center gap-1 ${isActive('/dashboard') ? 'text-blue-600' : 'text-gray-500'}`}>
                        <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                            {user.user_metadata.avatar_url ? (
                                <img src={user.user_metadata.avatar_url} alt="Foto de perfil" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xs font-bold text-gray-600">{user.email?.charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <span className="text-[10px] font-medium">Perfil</span>
                    </Link>
                ) : (
                    <Link href="/login" aria-label="Entrar" className={`flex min-h-11 flex-col items-center justify-center gap-1 ${isActive('/login') ? 'text-blue-600' : 'text-gray-500'}`}>
                        <User className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Entrar</span>
                    </Link>
                )}
            </div>
        </div>
    );
}
