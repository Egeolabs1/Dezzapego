import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Users, ShoppingBag, DollarSign, Activity, TrendingUp, BarChart3 } from 'lucide-react';
import { formatPrice } from '../../../lib/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalAds: 0,
        totalValue: 0,
        totalSellers: 0,
        recentAds: [] as any[],
        categoryData: [] as any[],
        trendData: [] as any[]
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const { data: ads, error } = await supabase
                    .from('ads')
                    .select('*')
                    .order('publishedAt', { ascending: false });

                if (error) throw error;
                if (!ads) return;

                const totalValue = ads.reduce((acc, ad) => acc + (Number(ad.price) || 0), 0);
                const uniqueSellers = new Set(ads.map(ad => ad.seller?.id).filter(Boolean));

                // Process Category Data
                const categoryCount = ads.reduce((acc: any, ad) => {
                    const cat = ad.category || 'Outros';
                    acc[cat] = (acc[cat] || 0) + 1;
                    return acc;
                }, {});
                const categoryData = Object.entries(categoryCount).map(([name, count]) => ({ name, count }));

                // Process Trend Data (Last 30 Days)
                const last30Days = [...Array(30)].map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    return d.toISOString().split('T')[0];
                }).reverse();

                const trendData = last30Days.map(date => {
                    const count = ads.filter(ad => ad.publishedAt?.startsWith(date)).length;
                    return { date: date.split('-').slice(1).join('/'), count }; // Format MM/DD
                });

                setStats({
                    totalAds: ads.length,
                    totalValue,
                    totalSellers: uniqueSellers.size,
                    recentAds: ads.slice(0, 5),
                    categoryData,
                    trendData
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

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Total de Anúncios</p>
                        <h3 className="text-2xl font-bold text-gray-900">{stats.totalAds}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                        <ShoppingBag className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Valor em Produtos</p>
                        <h3 className="text-2xl font-bold text-gray-900">{formatPrice(stats.totalValue)}</h3>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg text-green-600">
                        <DollarSign className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Vendedores Ativos</p>
                        <h3 className="text-2xl font-bold text-gray-900">{stats.totalSellers}</h3>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                        <Users className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 className="w-5 h-5 text-gray-500" />
                        <h2 className="text-lg font-semibold text-gray-800">Anúncios por Categoria</h2>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.categoryData}>
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f3f4f6' }}
                                />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Trend Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-gray-500" />
                        <h2 className="text-lg font-semibold text-gray-800">Crescimento (30 dias)</h2>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.trendData}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-gray-500" />
                    <h2 className="text-lg font-semibold text-gray-800">Atividade Recente</h2>
                </div>
                <div className="divide-y divide-gray-100">
                    {stats.recentAds.map(ad => (
                        <div key={ad.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                            <div className="flex items-center gap-4">
                                <img src={ad.images?.[0]} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                                <div>
                                    <p className="font-medium text-gray-900">{ad.title}</p>
                                    <p className="text-xs text-gray-500">por {ad.seller?.name || 'Vendedor'}</p>
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
