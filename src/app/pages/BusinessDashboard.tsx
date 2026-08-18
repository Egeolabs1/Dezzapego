'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, Settings, Users, BarChart3, Eye,
  Megaphone, ExternalLink, ShieldCheck, Pencil,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getPlanFeatures } from '../../lib/plans';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../../components/SEO';
import { BUSINESS_TYPE_LABELS } from '../../lib/businesses';
import type { Business, Ad, PlanFeatures } from '../../types';

export default function BusinessDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<Ad[]>([]);
  const [stats, setStats] = useState({ views: 0, followers: 0, adsCount: 0 });
  const [planFeatures, setPlanFeatures] = useState<PlanFeatures | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }

    async function load() {
      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!biz) {
        setLoading(false);
        return;
      }

      setBusiness(biz as Business);

      // Redirect to specialized dashboard based on business type
      if (biz.type === 'real_estate') {
        router.push('/business/imobiliaria');
        return;
      }
      if (biz.type === 'vehicle_dealer') {
        router.push('/business/veiculos');
        return;
      }

      // Load plan features
      try {
        const features = await getPlanFeatures(biz.id);
        setPlanFeatures(features);
      } catch {
        // Plan features unavailable — default state remains null
      }

      // Load ads
      const { data: adData } = await supabase
        .from('ads')
        .select('*')
        .eq('business_id', biz.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setAds((adData || []) as Ad[]);

      // Calculate stats
      const totalViews = (adData || []).reduce((sum: number, ad: any) => sum + (ad.views || 0), 0);
      setStats({
        views: totalViews,
        followers: biz.followers_count || 0,
        adsCount: (adData || []).length,
      });

      setLoading(false);
    }

    load();
  }, [user, authLoading, router]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Você ainda não tem uma empresa</h1>
          <p className="text-gray-500 mb-6">Crie sua página profissional no Dezzapego.</p>
          <Link href="/business/nova" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700">
            Criar Empresa
          </Link>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Visualizações', value: stats.views, icon: Eye, color: 'text-blue-600 bg-blue-50' },
    { label: 'Seguidores', value: stats.followers, icon: Users, color: 'text-purple-600 bg-purple-50' },
    { label: 'Anúncios', value: stats.adsCount, icon: Megaphone, color: 'text-green-600 bg-green-50' },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      <SEO title={`Dashboard — ${business.name}`} description="Painel de gerenciamento da sua empresa" noIndex />
      <Header />

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center overflow-hidden">
              {business.logo_url ? (
                <img src={business.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-blue-600">{business.name.charAt(0)}</span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                {business.name}
                {business.verification_status === 'verified' && (
                  <ShieldCheck className="w-5 h-5 text-blue-600 fill-blue-100" />
                )}
              </h1>
              <p className="text-sm text-gray-500">{BUSINESS_TYPE_LABELS[business.type]}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/empresa/${business.slug}`} className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">
              <ExternalLink className="w-4 h-4" /> Ver Página
            </Link>
            <Link href="/business/editar" className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Pencil className="w-4 h-4" /> Editar
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {statCards.map(card => (
            <div key={card.label} className="bg-white rounded-xl p-4 border border-gray-100">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm text-gray-500">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Plan Info */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 mb-6">
          <h2 className="font-bold text-gray-900 mb-3">Plano</h2>
          {planFeatures ? (
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-sm text-gray-500">Plano Atual</span>
                <p className="text-lg font-bold text-gray-900">{planFeatures.name}</p>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div>
                <span className="text-sm text-gray-500">Máx. Anúncios</span>
                <p className="text-lg font-bold text-gray-900">{planFeatures.max_listings}</p>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div className="flex gap-3 text-sm">
                <span className={planFeatures.has_crm ? 'text-green-600 font-medium' : 'text-gray-400'}>
                  {planFeatures.has_crm ? '✓' : '✗'} CRM
                </span>
                <span className={planFeatures.has_collections ? 'text-green-600 font-medium' : 'text-gray-400'}>
                  {planFeatures.has_collections ? '✓' : '✗'} Coleções
                </span>
                <span className={planFeatures.has_import_csv ? 'text-green-600 font-medium' : 'text-gray-400'}>
                  {planFeatures.has_import_csv ? '✓' : '✗'} Importação
                </span>
              </div>
              <div className="ml-auto">
                <Link href="#" className="text-sm text-blue-600 hover:underline font-medium">
                  Fazer Upgrade →
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Carregando informações do plano…</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 mb-6">
          <h2 className="font-bold text-gray-900 mb-3">Ações Rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/anunciar" className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors">
              <Megaphone className="w-6 h-6 text-blue-600" />
              <span className="text-xs font-medium text-gray-700">Novo Anúncio</span>
            </Link>
            <Link href="/meus-anuncios" className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <span className="text-xs font-medium text-gray-700">Meus Anúncios</span>
            </Link>
            <Link href={`/empresa/${business.slug}`} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors">
              <Eye className="w-6 h-6 text-blue-600" />
              <span className="text-xs font-medium text-gray-700">Ver Página</span>
            </Link>
            <Link href="/business/editar" className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors">
              <Settings className="w-6 h-6 text-blue-600" />
              <span className="text-xs font-medium text-gray-700">Configurações</span>
            </Link>
          </div>
        </div>

        {/* Recent Ads */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Anúncios Recentes</h2>
            <Link href="/meus-anuncios" className="text-sm text-blue-600 hover:underline">Ver todos</Link>
          </div>
          {ads.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum anúncio vinculado à empresa ainda.</p>
              <p className="text-sm mt-1">Ao criar um anúncio, vincule-o à sua empresa.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ads.slice(0, 5).map(ad => (
                <Link key={ad.id} href={`/anuncio/${ad.id}`} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                    <img src={ad.images?.[0]} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{ad.title}</p>
                    <p className="text-sm font-bold text-blue-600">R$ {ad.price.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <p>{ad.views || 0} views</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
