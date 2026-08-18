'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, Phone, MessageCircle, Globe, Instagram, Facebook,
  ShieldCheck, Calendar, Users, Star, Share2, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../../components/SEO';
import { AdCardSkeleton } from '../components/ui/skeleton';
import { formatPrice } from '../../lib/formatters';
import { getBusinessBySlug, followBusiness, unfollowBusiness, isFollowingBusiness, BUSINESS_TYPE_LABELS, DAY_LABELS } from '../../lib/businesses';
import type { Business, Ad } from '../../types';

type Tab = 'overview' | 'ads' | 'about' | 'reviews';

export default function BusinessPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isFollowing, setIsFollowing] = useState(false);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      const data = await getBusinessBySlug(slug);
      setBusiness(data);
      setLoading(false);
    }
    load();
  }, [slug]);

  useEffect(() => {
    if (!business || !user) return;
    isFollowingBusiness(business.id).then(setIsFollowing);
  }, [business, user]);

  useEffect(() => {
    if (!business || activeTab !== 'ads') return;
    setLoadingAds(true);
    supabase
      .from('ads')
      .select('*')
      .eq('business_id', business.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setAds((data || []) as Ad[]);
        setLoadingAds(false);
      });
  }, [business, activeTab]);

  const handleFollow = async () => {
    if (!user) {
      toast.error('Faça login para seguir esta empresa.');
      router.push('/login');
      return;
    }
    if (!business) return;
    try {
      if (isFollowing) {
        await unfollowBusiness(business.id);
        setIsFollowing(false);
        setBusiness(prev => prev ? { ...prev, followers_count: Math.max(prev.followers_count - 1, 0) } : prev);
        toast.success('Deixou de seguir.');
      } else {
        await followBusiness(business.id);
        setIsFollowing(true);
        setBusiness(prev => prev ? { ...prev, followers_count: prev.followers_count + 1 } : prev);
        toast.success('Agora você segue esta empresa!');
      }
    } catch {
      toast.error('Erro ao processar.');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({ title: business?.name, url: window.location.href });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado!');
    }
  };

  const handleWhatsApp = () => {
    if (!business?.whatsapp) return;
    const phone = business.whatsapp.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá! Vim pelo Dezzapego e tenho interesse nos seus produtos/serviços.`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
  };

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-48 bg-gray-200 rounded-2xl" />
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Empresa não encontrada</h1>
          <p className="text-gray-500 mb-6">Esta empresa não existe ou foi desativada.</p>
          <Link href="/" className="text-blue-600 hover:underline">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Início' },
    { id: 'ads', label: `Produtos (${business.ads_count})` },
    { id: 'about', label: 'Sobre' },
  ];

  return (
    <div className="bg-gray-50 min-h-screen pb-24 md:pb-12">
      <SEO
        title={business.name}
        description={business.description || `${business.name} no Dezzapego`}
        image={business.cover_url || business.logo_url || undefined}
        type="website"
      />
      <Header />

      {/* Cover */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-blue-600 to-purple-600 overflow-hidden">
        {business.cover_url && (
          <img src={business.cover_url} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* Profile Header */}
      <div className="container mx-auto px-4 -mt-12 relative z-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Logo */}
            <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center overflow-hidden shrink-0">
              {business.logo_url ? (
                <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-blue-600">{business.name.charAt(0)}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
                {business.verification_status === 'verified' && (
                  <span title="Empresa Verificada"><ShieldCheck className="w-6 h-6 text-blue-600 fill-blue-100" /></span>
                )}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {BUSINESS_TYPE_LABELS[business.type] || 'Empresa'}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                {business.city && business.state && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {business.city}, {business.state}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> {business.rating.toFixed(1)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" /> {business.followers_count} seguidores
                </span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleFollow}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  isFollowing
                    ? 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 shadow-md'
                }`}
              >
                {isFollowing ? 'Seguindo' : 'Seguir'}
              </button>
              {business.whatsapp && (
                <button
                  onClick={handleWhatsApp}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-green-600 text-white hover:bg-green-700 shadow-green-200 shadow-md flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </button>
              )}
              <button
                onClick={handleShare}
                className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600"
                title="Compartilhar"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-white rounded-xl p-1 border border-gray-100 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[80px] py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {business.description && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h2 className="font-bold text-gray-900 mb-2">Sobre</h2>
                  <p className="text-gray-600 leading-relaxed">{business.description}</p>
                </div>
              )}

              {/* Contact Info */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h2 className="font-bold text-gray-900 mb-3">Contato</h2>
                <div className="space-y-2">
                  {business.phone && (
                    <a href={`tel:${business.phone}`} className="flex items-center gap-3 text-sm text-gray-600 hover:text-blue-600 p-2 rounded-lg hover:bg-gray-50">
                      <Phone className="w-4 h-4" /> {business.phone}
                    </a>
                  )}
                  {business.email && (
                    <a href={`mailto:${business.email}`} className="flex items-center gap-3 text-sm text-gray-600 hover:text-blue-600 p-2 rounded-lg hover:bg-gray-50">
                      <Globe className="w-4 h-4" /> {business.email}
                    </a>
                  )}
                  {business.website && (
                    <a href={business.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-gray-600 hover:text-blue-600 p-2 rounded-lg hover:bg-gray-50">
                      <ExternalLink className="w-4 h-4" /> {business.website}
                    </a>
                  )}
                  {business.instagram && (
                    <a href={`https://instagram.com/${business.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-gray-600 hover:text-blue-600 p-2 rounded-lg hover:bg-gray-50">
                      <Instagram className="w-4 h-4" /> @{business.instagram}
                    </a>
                  )}
                  {business.facebook && (
                    <a href={business.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-gray-600 hover:text-blue-600 p-2 rounded-lg hover:bg-gray-50">
                      <Facebook className="w-4 h-4" /> Facebook
                    </a>
                  )}
                </div>
              </div>

              {/* Location */}
              {(business.city || business.address) && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" /> Localização
                  </h2>
                  <p className="text-sm text-gray-600">
                    {[business.address, business.neighborhood, business.city, business.state].filter(Boolean).join(', ')}
                  </p>
                  {business.lat && business.lng && (
                    <div className="mt-3 aspect-video rounded-xl overflow-hidden bg-gray-100">
                      <iframe
                        title="Localização"
                        width="100%" height="100%" frameBorder="0" scrolling="no"
                        src={`https://maps.google.com/maps?q=${business.lat},${business.lng}&z=15&output=embed`}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Opening Hours */}
              {business.opening_hours && Object.keys(business.opening_hours).length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" /> Horário de Funcionamento
                  </h2>
                  <div className="space-y-1">
                    {Object.entries(DAY_LABELS).map(([key, label]) => {
                      const hours = (business.opening_hours as Record<string, string>)[key];
                      return (
                        <div key={key} className="flex justify-between text-sm py-1">
                          <span className="text-gray-600">{label}</span>
                          <span className="font-medium text-gray-900">{hours || 'Fechado'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ADS */}
          {activeTab === 'ads' && (
            <div>
              {loadingAds ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => <AdCardSkeleton key={i} />)}
                </div>
              ) : ads.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                  <p className="text-gray-500">Nenhum anúncio publicado ainda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {ads.map(ad => (
                    <Link
                      key={ad.id}
                      href={`/anuncio/${ad.id}`}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
                    >
                      <div className="aspect-[4/3] bg-gray-100">
                        <img src={ad.images?.[0]} alt={ad.title} className="w-full h-full object-contain bg-white" loading="lazy" />
                      </div>
                      <div className="p-3">
                        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 group-hover:text-blue-600">{ad.title}</h3>
                        <p className="text-base font-bold text-blue-600 mt-1">{formatPrice(ad.price)}</p>
                        <p className="text-xs text-gray-500 mt-1">{(ad as any).location?.city}, {(ad as any).location?.state}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABOUT */}
          {activeTab === 'about' && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Tipo</h3>
                <p className="text-gray-600">{BUSINESS_TYPE_LABELS[business.type]}</p>
              </div>
              {business.cnpj && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">CNPJ</h3>
                  <p className="text-gray-600">{business.cnpj}</p>
                </div>
              )}
              {business.description && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Descrição</h3>
                  <p className="text-gray-600 leading-relaxed">{business.description}</p>
                </div>
              )}
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Membro desde</h3>
                <p className="text-gray-600">{new Date(business.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 z-40 flex gap-2">
        <button
          onClick={handleFollow}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
            isFollowing ? 'bg-gray-100 text-gray-700 border border-gray-300' : 'bg-blue-600 text-white'
          }`}
        >
          {isFollowing ? 'Seguindo' : 'Seguir'}
        </button>
        {business.whatsapp && (
          <button
            onClick={handleWhatsApp}
            className="flex-1 py-3 rounded-xl font-semibold text-sm bg-green-600 text-white flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </button>
        )}
      </div>
    </div>
  );
}
