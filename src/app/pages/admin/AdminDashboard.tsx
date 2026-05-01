import { ReactNode, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Users, ShoppingBag, DollarSign, Activity, TrendingUp, BarChart3, Eye, Flag, Star, CreditCard, Globe2 } from 'lucide-react';
import { formatPrice } from '../../../lib/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from 'recharts';

type DashboardStats = {
    totalAds: number;
    totalValue: number;
    totalSellers: number;
    totalViews: number;
    avgPrice: number;
    featuredAds: number;
    pendingReports: number;
    siteVisits: number;
    uniqueVisitors: number;
    revenueCents: number;
    stripeRevenueCents: number;
    pixgoRevenueCents: number;
    pendingPayments: number;
    paidPayments: number;
    expiredPayments: number;
    refundedPayments: number;
    expiringFeaturedAds: number;
    topPages: { path: string; visits: number }[];
    topReferrers: { referrer: string; visits: number }[];
    recentAds: any[];
    categoryData: { name: string; count: number }[];
    trendData: { date: string; ads: number; views: number; visits: number }[];
    topAds: { id: string; title: string; views: number; price: number; image?: string }[];
    topSellers: { seller: string; ads: number; views: number }[];
};

const initialStats: DashboardStats = {
    totalAds: 0,
    totalValue: 0,
    totalSellers: 0,
    totalViews: 0,
    avgPrice: 0,
    featuredAds: 0,
    pendingReports: 0,
    siteVisits: 0,
    uniqueVisitors: 0,
    revenueCents: 0,
    stripeRevenueCents: 0,
    pixgoRevenueCents: 0,
    pendingPayments: 0,
    paidPayments: 0,
    expiredPayments: 0,
    refundedPayments: 0,
    expiringFeaturedAds: 0,
    topPages: [],
    topReferrers: [],
    recentAds: [],
    categoryData: [],
    trendData: [],
    topAds: [],
    topSellers: [],
};

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats>(initialStats);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const { data: ads, error } = await supabase
                    .from('ads')
                    .select('*')
                    .order('publishedAt', { ascending: false });

                if (error) throw error;
                const safeAds = ads || [];

                const [{ data: paymentsData }, { data: visitsData }] = await Promise.all([
                    supabase
                        .from('featured_payments')
                        .select('id, status, provider, amount_cents, gross_amount_cents, created_at'),
                    supabase
                        .from('site_visits')
                        .select('id, session_id, path, referrer, created_at'),
                ]);

                const safePayments = paymentsData || [];
                const safeVisits = visitsData || [];

                const totalValue = safeAds.reduce((acc, ad) => acc + (Number(ad.price) || 0), 0);
                const totalViews = safeAds.reduce((acc, ad) => acc + (Number(ad.views) || 0), 0);
                const uniqueSellers = new Set(safeAds.map(ad => ad.seller?.id || ad.user_id).filter(Boolean));
                const featuredAds = safeAds.filter((ad) => {
                    const expiresAt = ad.featured_expires_at || ad.featuredExpiresAt;
                    return Boolean(ad.featured) && (!expiresAt || new Date(expiresAt) > new Date());
                }).length;
                const sevenDaysFromNow = new Date();
                sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
                const expiringFeaturedAds = safeAds.filter((ad) => {
                    const expiresAt = ad.featured_expires_at || ad.featuredExpiresAt;
                    if (!ad.featured || !expiresAt) return false;
                    const expiresDate = new Date(expiresAt);
                    return expiresDate > new Date() && expiresDate <= sevenDaysFromNow;
                }).length;
                const avgPrice = safeAds.length ? totalValue / safeAds.length : 0;
                const revenueCents = safePayments
                    .filter((payment) => payment.status === 'paid')
                    .reduce((acc, payment) => acc + (Number(payment.gross_amount_cents || payment.amount_cents) || 0), 0);
                const stripeRevenueCents = safePayments
                    .filter((payment) => payment.status === 'paid' && payment.provider === 'stripe')
                    .reduce((acc, payment) => acc + (Number(payment.gross_amount_cents || payment.amount_cents) || 0), 0);
                const pixgoRevenueCents = safePayments
                    .filter((payment) => payment.status === 'paid' && payment.provider === 'pixgo')
                    .reduce((acc, payment) => acc + (Number(payment.gross_amount_cents || payment.amount_cents) || 0), 0);
                const pendingPayments = safePayments.filter((payment) => payment.status === 'pending').length;
                const paidPayments = safePayments.filter((payment) => payment.status === 'paid').length;
                const expiredPayments = safePayments.filter((payment) => payment.status === 'expired').length;
                const refundedPayments = safePayments.filter((payment) => payment.status === 'refunded').length;
                const uniqueVisitors = new Set(safeVisits.map((visit) => visit.session_id).filter(Boolean)).size;

                const topPages = Object.entries(safeVisits.reduce((acc: Record<string, number>, visit) => {
                    const path = visit.path || '/';
                    acc[path] = (acc[path] || 0) + 1;
                    return acc;
                }, {})).map(([path, visits]) => ({ path, visits })).sort((a, b) => b.visits - a.visits).slice(0, 5);

                const topReferrers = Object.entries(safeVisits.reduce((acc: Record<string, number>, visit) => {
                    const referrer = visit.referrer || 'Direto';
                    acc[referrer] = (acc[referrer] || 0) + 1;
                    return acc;
                }, {})).map(([referrer, visits]) => ({ referrer, visits })).sort((a, b) => b.visits - a.visits).slice(0, 5);

                const categoryCount = safeAds.reduce((acc: Record<string, number>, ad) => {
                    const cat = ad.category || 'Outros';
                    acc[cat] = (acc[cat] || 0) + 1;
                    return acc;
                }, {});
                const categoryData = Object.entries(categoryCount)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count);

                const last30Days = [...Array(30)].map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    return d.toISOString().split('T')[0];
                }).reverse();

                const trendData = last30Days.map((date) => {
                    const dailyAds = safeAds.filter((ad) => (ad.publishedAt || '').startsWith(date));
                    const dailyViews = dailyAds.reduce((acc, ad) => acc + (Number(ad.views) || 0), 0);
                    const dailyVisits = safeVisits.filter((visit) => (visit.created_at || '').startsWith(date)).length;
                    return {
                        date: date.split('-').slice(1).join('/'),
                        ads: dailyAds.length,
                        views: dailyViews,
                        visits: dailyVisits,
                    };
                });

                const topAds = safeAds
                    .map((ad) => ({
                        id: ad.id,
                        title: ad.title || 'Sem título',
                        views: Number(ad.views) || 0,
                        price: Number(ad.price) || 0,
                        image: ad.images?.[0],
                    }))
                    .sort((a, b) => b.views - a.views)
                    .slice(0, 5);

                const sellerMap = safeAds.reduce((acc: Record<string, { seller: string; ads: number; views: number }>, ad) => {
                    const sellerKey = ad.seller?.id || ad.user_id || 'unknown';
                    if (!acc[sellerKey]) {
                        acc[sellerKey] = {
                            seller: ad.seller?.name || 'Sem nome',
                            ads: 0,
                            views: 0,
                        };
                    }
                    acc[sellerKey].ads += 1;
                    acc[sellerKey].views += Number(ad.views) || 0;
                    return acc;
                }, {});
                const topSellers = Object.values(sellerMap)
                    .sort((a, b) => b.views - a.views)
                    .slice(0, 5);

                let pendingReports = 0;
                try {
                    const { data: reports } = await supabase
                        .from('reports')
                        .select('id, status')
                        .eq('status', 'pending');
                    pendingReports = reports?.length || 0;
                } catch {
                    pendingReports = 0;
                }

                setStats({
                    totalAds: safeAds.length,
                    totalValue,
                    totalSellers: uniqueSellers.size,
                    totalViews,
                    avgPrice,
                    featuredAds,
                    pendingReports,
                    siteVisits: safeVisits.length,
                    uniqueVisitors,
                    revenueCents,
                    stripeRevenueCents,
                    pixgoRevenueCents,
                    pendingPayments,
                    paidPayments,
                    expiredPayments,
                    refundedPayments,
                    expiringFeaturedAds,
                    topPages,
                    topReferrers,
                    recentAds: safeAds.slice(0, 8),
                    categoryData,
                    trendData,
                    topAds,
                    topSellers,
                });
            } catch (err) {
                console.error('Error fetching admin stats:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold text-gray-800">Visão Geral</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <StatCard title="Total de Anúncios" value={String(stats.totalAds)} icon={<ShoppingBag className="w-6 h-6" />} tint="blue" />
                <StatCard title="Visualizações Totais" value={stats.totalViews.toLocaleString('pt-BR')} icon={<Eye className="w-6 h-6" />} tint="indigo" />
                <StatCard title="Vendedores Ativos" value={String(stats.totalSellers)} icon={<Users className="w-6 h-6" />} tint="purple" />
                <StatCard title="Preço Médio" value={formatPrice(stats.avgPrice)} icon={<DollarSign className="w-6 h-6" />} tint="green" />
                <StatCard title="Valor em Produtos" value={formatPrice(stats.totalValue)} icon={<BarChart3 className="w-6 h-6" />} tint="emerald" />
                <StatCard title="Visitas do Site" value={stats.siteVisits.toLocaleString('pt-BR')} icon={<Globe2 className="w-6 h-6" />} tint="cyan" />
                <StatCard title="Visitantes Únicos" value={stats.uniqueVisitors.toLocaleString('pt-BR')} icon={<Activity className="w-6 h-6" />} tint="slate" />
                <StatCard title="Receita em Destaques" value={formatPrice(stats.revenueCents / 100)} icon={<CreditCard className="w-6 h-6" />} tint="green" />
                <StatCard title="Receita Stripe" value={formatPrice(stats.stripeRevenueCents / 100)} icon={<CreditCard className="w-6 h-6" />} tint="indigo" />
                <StatCard title="Receita PixGo" value={formatPrice(stats.pixgoRevenueCents / 100)} icon={<CreditCard className="w-6 h-6" />} tint="emerald" />
                <StatCard title="Anúncios em Destaque" value={String(stats.featuredAds)} icon={<Star className="w-6 h-6" />} tint="yellow" />
                <StatCard title="Destaques Expirando" value={String(stats.expiringFeaturedAds)} icon={<Star className="w-6 h-6" />} tint="orange" />
                <StatCard title="Pagamentos Pendentes" value={String(stats.pendingPayments)} icon={<CreditCard className="w-6 h-6" />} tint="orange" />
                <StatCard title="Pagamentos Confirmados" value={String(stats.paidPayments)} icon={<CreditCard className="w-6 h-6" />} tint="green" />
                <StatCard title="Expirados/Reembolsados" value={`${stats.expiredPayments}/${stats.refundedPayments}`} icon={<CreditCard className="w-6 h-6" />} tint="slate" />
                <StatCard title="Denúncias Pendentes" value={String(stats.pendingReports)} icon={<Flag className="w-6 h-6" />} tint="red" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 className="w-5 h-5 text-gray-500" />
                        <h2 className="text-lg font-semibold text-gray-800">Anúncios por Categoria</h2>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.categoryData}>
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-gray-500" />
                        <h2 className="text-lg font-semibold text-gray-800">Tendência (30 dias)</h2>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.trendData}>
                                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend />
                                <Line type="monotone" dataKey="ads" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Anúncios" />
                                <Line type="monotone" dataKey="views" stroke="#2563eb" strokeWidth={2} dot={false} name="Views dos anúncios do dia" />
                                <Line type="monotone" dataKey="visits" stroke="#10b981" strokeWidth={2} dot={false} name="Visitas do site" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                        <Eye className="w-5 h-5 text-gray-500" />
                        <h2 className="text-lg font-semibold text-gray-800">Top 5 anúncios mais vistos</h2>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {stats.topAds.map((ad) => (
                            <div key={ad.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                <div className="flex items-center gap-3 min-w-0">
                                    <img src={ad.image || 'https://via.placeholder.com/80x80?text=Sem+Foto'} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{ad.title}</p>
                                        <p className="text-xs text-gray-500">{formatPrice(ad.price)}</p>
                                    </div>
                                </div>
                                <span className="text-sm font-semibold text-blue-600">{ad.views.toLocaleString('pt-BR')} views</span>
                            </div>
                        ))}
                        {stats.topAds.length === 0 && <div className="p-8 text-center text-gray-500">Sem dados de anúncios.</div>}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-500" />
                        <h2 className="text-lg font-semibold text-gray-800">Top 5 anunciantes por visualizações</h2>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {stats.topSellers.map((seller, idx) => (
                            <div key={`${seller.seller}-${idx}`} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                <div>
                                    <p className="font-medium text-gray-900">{seller.seller}</p>
                                    <p className="text-xs text-gray-500">{seller.ads} anúncio(s)</p>
                                </div>
                                <span className="text-sm font-semibold text-blue-600">{seller.views.toLocaleString('pt-BR')} views</span>
                            </div>
                        ))}
                        {stats.topSellers.length === 0 && <div className="p-8 text-center text-gray-500">Sem dados de anunciantes.</div>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                        <Globe2 className="w-5 h-5 text-gray-500" />
                        <h2 className="text-lg font-semibold text-gray-800">Páginas mais visitadas</h2>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {stats.topPages.map((page) => (
                            <div key={page.path} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                <p className="font-medium text-gray-900 truncate">{page.path}</p>
                                <span className="text-sm font-semibold text-blue-600">{page.visits.toLocaleString('pt-BR')} visitas</span>
                            </div>
                        ))}
                        {stats.topPages.length === 0 && <div className="p-8 text-center text-gray-500">Sem dados de visitas.</div>}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-gray-500" />
                        <h2 className="text-lg font-semibold text-gray-800">Principais origens</h2>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {stats.topReferrers.map((referrer) => (
                            <div key={referrer.referrer} className="p-4 flex items-center justify-between hover:bg-gray-50 gap-4">
                                <p className="font-medium text-gray-900 truncate">{referrer.referrer}</p>
                                <span className="text-sm font-semibold text-blue-600">{referrer.visits.toLocaleString('pt-BR')} visitas</span>
                            </div>
                        ))}
                        {stats.topReferrers.length === 0 && <div className="p-8 text-center text-gray-500">Sem dados de origem.</div>}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-gray-500" />
                    <h2 className="text-lg font-semibold text-gray-800">Atividade Recente</h2>
                </div>
                <div className="divide-y divide-gray-100">
                    {stats.recentAds.map(ad => (
                        <div key={ad.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                            <div className="flex items-center gap-4 min-w-0">
                                <img src={ad.images?.[0] || 'https://via.placeholder.com/80x80?text=Sem+Foto'} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                                <div className="min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{ad.title}</p>
                                    <p className="text-xs text-gray-500">por {ad.seller?.name || 'Vendedor'} • {Number(ad.views || 0).toLocaleString('pt-BR')} views</p>
                                </div>
                            </div>
                            <span className="text-sm font-medium text-gray-900">{formatPrice(ad.price)}</span>
                        </div>
                    ))}
                    {stats.recentAds.length === 0 && (
                        <div className="p-8 text-center text-gray-500">Nenhuma atividade recente.</div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, tint }: { title: string; value: string; icon: ReactNode; tint: 'blue' | 'green' | 'purple' | 'indigo' | 'emerald' | 'yellow' | 'red' | 'cyan' | 'slate' | 'orange' }) {
    const tintClass = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        yellow: 'bg-yellow-50 text-yellow-600',
        red: 'bg-red-50 text-red-600',
        cyan: 'bg-cyan-50 text-cyan-600',
        slate: 'bg-slate-100 text-slate-600',
        orange: 'bg-orange-50 text-orange-600',
    }[tint];

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            </div>
            <div className={`p-3 rounded-lg ${tintClass}`}>
                {icon}
            </div>
        </div>
    );
}
