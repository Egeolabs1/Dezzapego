import { Home, Search, PlusCircle, User, Heart } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function MobileNav() {
    const { pathname } = useLocation();
    const { user } = useAuth();

    const isActive = (path: string) => pathname === path;

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between max-w-sm mx-auto">
                <Link to="/" className={`flex flex-col items-center gap-1 ${isActive('/') ? 'text-blue-600' : 'text-gray-500'}`}>
                    <Home className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Início</span>
                </Link>

                <Link to="/favoritos" className={`flex flex-col items-center gap-1 ${isActive('/favoritos') ? 'text-blue-600' : 'text-gray-500'}`}>
                    <Heart className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Favoritos</span>
                </Link>

                <Link to="/anunciar">
                    <div className="flex flex-col items-center -mt-6">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg text-white mb-1 transform active:scale-95 transition-transform">
                            <PlusCircle className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-medium text-gray-600">Anunciar</span>
                    </div>
                </Link>

                <Link to="/" className={`flex flex-col items-center gap-1 ${isActive('/search') ? 'text-blue-600' : 'text-gray-500'}`}>
                    <Search className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Buscar</span>
                </Link>

                {user ? (
                    <Link to="/dashboard" className={`flex flex-col items-center gap-1 ${isActive('/dashboard') ? 'text-blue-600' : 'text-gray-500'}`}>
                        <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                            {user.user_metadata.avatar_url ? (
                                <img src={user.user_metadata.avatar_url} alt="User" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xs font-bold text-gray-600">{user.email?.charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <span className="text-[10px] font-medium">Perfil</span>
                    </Link>
                ) : (
                    <Link to="/login" className={`flex flex-col items-center gap-1 ${isActive('/login') ? 'text-blue-600' : 'text-gray-500'}`}>
                        <User className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Entrar</span>
                    </Link>
                )}
            </div>
        </div>
    );
}
