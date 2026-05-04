import { useState, useEffect, useMemo } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    ShoppingBag,
    Users,
    LogOut,
    Menu,
    Settings,
    Flag,
    Image as ImageIcon,
    Shield,
    Bell,
    Home,
    MessageSquare,
    CreditCard,
    BadgeCheck,
    type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from '../../components/Logo';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';
import { useAdminPanelAlerts } from '../../hooks/useAdminPanelAlerts';

type NavItem = {
    icon: LucideIcon;
    label: string;
    path: string;
    badge?: number;
};

export default function AdminLayout() {

    const { user, loading, signOut } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const alerts = useAdminPanelAlerts(Boolean(user), navigate);
    const navItems: NavItem[] = useMemo(
        () => [
            { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
            { icon: ShoppingBag, label: 'Anúncios', path: '/admin/anuncios' },
            { icon: CreditCard, label: 'Pagamentos', path: '/admin/pagamentos' },
            { icon: MessageSquare, label: 'Mensagens', path: '/admin/mensagens', badge: alerts.unreadMessages },
            {
                icon: BadgeCheck,
                label: 'Verificação de contas',
                path: '/admin/verificacao',
                badge: alerts.pendingVerifications,
            },
            { icon: Users, label: 'Usuários', path: '/admin/usuarios' },
            { icon: Flag, label: 'Denúncias', path: '/admin/denuncias' },
            { icon: Bell, label: 'Notificações', path: '/admin/notificacoes' },
            { icon: ImageIcon, label: 'Banners', path: '/admin/banners' },
            { icon: Shield, label: 'Logs', path: '/admin/logs' },
            { icon: Settings, label: 'Configurações', path: '/admin/configuracoes' },
        ],
        [alerts.unreadMessages, alerts.pendingVerifications],
    );

    // Strict auth check for Admin
    useEffect(() => {
        if (!loading) {
            if (!user) {
                navigate('/login');
            } else {
                // Check if user is admin via profile
                // Ideally this should be a stronger check or handled by not rendering the route
                // But for client-side redirect:
                const checkAdmin = async () => {
                    const { data, error } = await supabase.rpc('is_admin');
                    if (error || !data) {
                        toast.error('Acesso não autorizado.');
                        navigate('/');
                    }
                };
                checkAdmin();
            }
        }
    }, [user, loading, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) return null;

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Sidebar - Desktop */}
            <aside
                className={`fixed inset-y-0 left-0 bg-white border-r border-gray-200 w-64 z-40 flex flex-col transform transition-transform duration-300 md:relative md:translate-x-0 md:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="h-full min-h-0 flex flex-col">
                    <div className="shrink-0 p-6 border-b border-gray-100 flex items-center justify-between">
                        <Logo />
                        <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-500" title="Fechar menu">
                            ×
                        </button>
                    </div>

                    <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1 overscroll-contain">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <Icon className="w-5 h-5 shrink-0" />
                                    <span className="flex-1 min-w-0 truncate">{item.label}</span>
                                    {item.badge != null && item.badge > 0 ? (
                                        <span className="shrink-0 min-w-[1.25rem] h-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold inline-flex items-center justify-center tabular-nums">
                                            {item.badge > 99 ? '99+' : item.badge}
                                        </span>
                                    ) : null}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="shrink-0 p-4 border-t border-gray-100 bg-white">
                        <Link
                            to="/"
                            className="relative z-10 flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors mb-2"
                        >
                            <Home className="w-5 h-5" />
                            Voltar ao Site
                        </Link>
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            Sair
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between gap-3">
                    <Logo />
                    <div className="flex items-center gap-2 shrink-0">
                        <Link
                            to="/"
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 px-2 py-1.5 rounded-lg hover:bg-blue-50"
                        >
                            Site
                        </Link>
                        <button type="button" onClick={() => setSidebarOpen(true)} className="text-gray-600 p-2" title="Abrir menu">
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-4 md:p-8">
                    <Outlet />
                </div>
            </main>

            {/* Overlay for mobile sidebar (abaixo da sidebar z-40) */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}
