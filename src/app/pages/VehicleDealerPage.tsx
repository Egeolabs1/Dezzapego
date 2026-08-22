'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, Phone, MessageCircle, Heart, Share2, Star,
  Filter, Fuel as FuelIcon, Car,
} from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../../components/SEO';
import { formatPrice } from '../../lib/formatters';
import {
  getBusinessBySlug,
  followBusiness,
  unfollowBusiness,
  isFollowingBusiness,
} from '../../lib/businesses';
import {
  getVehicleDealerByBusinessId,
  listVehiclesByBusiness,
  getVehicleFilters,
  TRANSMISSION_LABELS,
  FUEL_LABELS,
  simulateFinancing,
} from '../../lib/vehicleDealer';
import type {
  Business,
  BusinessVehicleDealer,
  VehicleListing,
  VehicleFilters,
} from '../../types';
import TestDriveForm from './TestDriveForm';
import TradeInForm from './TradeInForm';

type Tab = 'featured' | 'stock' | 'about' | 'reviews';

export default function VehicleDealerPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [dealerData, setDealerData] = useState<BusinessVehicleDealer | null>(null);
  const [vehicles, setVehicles] = useState<VehicleListing[]>([]);
  const [featuredVehicles, setFeaturedVehicles] = useState<VehicleListing[]>([]);
  const [filters, setFilters] = useState<VehicleFilters | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('featured');
  const [isFollowing, setIsFollowing] = useState(false);

  // Filter states
  const [filterBrand, setFilterBrand] = useState('');
  const [filterFuel, setFilterFuel] = useState('');
  const [filterTransmission, setFilterTransmission] = useState('');
  const [filterMinYear, setFilterMinYear] = useState('');
  const [filterMaxYear, setFilterMaxYear] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'year_desc'>('newest');

  // Financing simulator
  const [finVehiclePrice, setFinVehiclePrice] = useState(0);
  const [finDownPayment, setFinDownPayment] = useState(0);
  const [finInstallments, setFinInstallments] = useState(60);
  const [finResult, setFinResult] = useState<null | {
    estimated_monthly: number;
    estimated_total: number;
    financed_amount: number;
    disclaimer: string;
  }>(null);

  // Modal states
  const [showTestDrive, setShowTestDrive] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [showTradeIn, setShowTradeIn] = useState(false);

  // ── Load business by slug ───────────────────────────────────────
  useEffect(() => {
    async function load() {
      if (!slug) return;
      const biz = await getBusinessBySlug(slug);
      setBusiness(biz);
      setLoading(false);
    }
    load();
  }, [slug]);

  // ── Load dealer data + vehicles + filters ───────────────────────
  useEffect(() => {
    if (!business) return;

    async function loadExtra() {
      const [dealer, vehicleResult, filtersData] = await Promise.all([
        getVehicleDealerByBusinessId(business!.id),
        listVehiclesByBusiness(business!.id, { status: 'active' }),
        getVehicleFilters(business!.id),
      ]);
      setDealerData(dealer);
      setFilters(filtersData);

      const activeVehicles = vehicleResult.data;
      setVehicles(activeVehicles);
      // Featured: pick up to 8 most viewed
      setFeaturedVehicles(
        [...activeVehicles]
          .sort((a, b) => b.views_count - a.views_count)
          .slice(0, 8),
      );
    }
    loadExtra();
  }, [business]);

  // ── Load vehicles with filters ──────────────────────────────────
  useEffect(() => {
    if (!business || activeTab !== 'stock') return;

    async function loadFiltered() {
      setLoadingVehicles(true);
      try {
        const filterParams: Record<string, string | number> = { status: 'active' };
        if (filterBrand) filterParams.brand = filterBrand;
        if (filterFuel) filterParams.fuel = filterFuel;
        if (filterTransmission) filterParams.transmission = filterTransmission;
        if (filterMinYear) filterParams.min_year = Number(filterMinYear);
        if (filterMaxYear) filterParams.max_year = Number(filterMaxYear);
        if (filterMinPrice) filterParams.min_price = Number(filterMinPrice);
        if (filterMaxPrice) filterParams.max_price = Number(filterMaxPrice);

        const result = await listVehiclesByBusiness(business!.id, filterParams);
        setVehicles(result.data);
      } catch {
        toast.error('Erro ao carregar veículos.');
      } finally {
        setLoadingVehicles(false);
      }
    }
    loadFiltered();
  }, [business, activeTab, filterBrand, filterFuel, filterTransmission, filterMinYear, filterMaxYear, filterMinPrice, filterMaxPrice]);

  // ── Follow check ────────────────────────────────────────────────
  useEffect(() => {
    if (!business || !user) return;
    isFollowingBusiness(business.id).then(setIsFollowing);
  }, [business, user]);

  // ── Handlers ────────────────────────────────────────────────────
  const handleFollow = async () => {
    if (!user) {
      toast.error('Faça login para seguir esta loja.');
      router.push('/login');
      return;
    }
    if (!business) return;
    try {
      if (isFollowing) {
        await unfollowBusiness(business.id);
        setIsFollowing(false);
        setBusiness(prev =>
          prev ? { ...prev, followers_count: Math.max(prev.followers_count - 1, 0) } : prev,
        );
        toast.success('Deixou de seguir.');
      } else {
        await followBusiness(business.id);
        setIsFollowing(true);
        setBusiness(prev =>
          prev ? { ...prev, followers_count: prev.followers_count + 1 } : prev,
        );
        toast.success('Agora você segue esta loja!');
      }
    } catch {
      toast.error('Erro ao processar.');
    }
  };

  const handleWhatsApp = () => {
    if (!business?.whatsapp) return;
    const phone = business.whatsapp.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Olá! Vim pelo Dezzapego e tenho interesse em veículos da ${business!.name}.`,
    );
    window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
  };

  const handleShare = async () => {
    try {
      await navigator.share({ title: business?.name, url: window.location.href });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado!');
    }
  };

  const handleTradeIn = () => {
    setShowTradeIn(true);
  };

  const handleSimulateFinancing = async () => {
    if (!finVehiclePrice || finVehiclePrice <= 0) {
      toast.error('Informe o valor do veículo.');
      return;
    }
    try {
      const result = await simulateFinancing(finVehiclePrice, finDownPayment, finInstallments);
      setFinResult({
        estimated_monthly: result.estimated_monthly,
        estimated_total: result.estimated_total,
        financed_amount: result.financed_amount,
        disclaimer: result.disclaimer,
      });
    } catch {
      toast.error('Erro ao simular financiamento.');
    }
  };

  const handleClearFilters = () => {
    setFilterBrand('');
    setFilterFuel('');
    setFilterTransmission('');
    setFilterMinYear('');
    setFilterMaxYear('');
    setFilterMinPrice('');
    setFilterMaxPrice('');
  };

  const sortedVehicles = [...vehicles].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc': return a.price - b.price;
      case 'price_desc': return b.price - a.price;
      case 'year_desc': return b.year_model - a.year_model;
      default: return 0; // newest (default order from DB)
    }
  });

  const activeFilterCount = [filterBrand, filterFuel, filterTransmission, filterMinYear, filterMaxYear, filterMinPrice, filterMaxPrice].filter(Boolean).length;

  // ── Loading state ───────────────────────────────────────────────
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

  // ── Not found ───────────────────────────────────────────────────
  if (!business) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Loja não encontrada</h1>
          <p className="text-gray-500 mb-6">Esta loja de veículos não existe ou foi desativada.</p>
          <Link href="/" className="text-purple-600 hover:underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  // ── Derived stats ───────────────────────────────────────────────
  const stats = [
    { label: 'Veículos', value: vehicles.length, icon: Car },
    { label: 'Seguidores', value: business.followers_count, icon: Heart },
    {
      label: 'Marcas',
      value: dealerData?.brands_worked?.length ?? 0,
      icon: Star,
    },
    { label: 'Avaliação', value: business.rating.toFixed(1), icon: Star },
  ];

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'featured', label: 'Início' },
    { id: 'stock', label: 'Estoque', count: vehicles.length },
    { id: 'about', label: 'Sobre' },
    { id: 'reviews', label: 'Avaliações' },
  ];

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="bg-gray-50 min-h-screen pb-24 md:pb-12">
      <SEO
        title={business.name}
        description={
          dealerData?.brands_worked?.length
            ? `${business.name} — ${dealerData.brands_worked.join(', ')}`
            : `${business.name} no Dezzapego`
        }
        image={business.cover_url || business.logo_url || undefined}
        type="website"
      />
      <Header />

      {/* ── Cover ─────────────────────────────────────────── */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-purple-600 to-violet-500 overflow-hidden">
        {business.cover_url && (
          <img src={business.cover_url} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* ── Profile Header ────────────────────────────────── */}
      <div className="container mx-auto px-4 -mt-12 relative z-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Logo */}
            <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center overflow-hidden shrink-0">
              {business.logo_url ? (
                <img
                  src={business.logo_url}
                  alt={business.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-purple-600">{business.name.charAt(0)}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
                {business.verification_status === 'verified' && (
                  <span title="Loja Verificada">
                    <svg className="w-6 h-6 text-purple-600 fill-purple-100" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </span>
                )}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                  Loja de Veículos
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                {business.city && business.state && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {business.city}, {business.state}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4" /> {business.followers_count} seguidores
                </span>
                <span className="flex items-center gap-1">
                  <Car className="w-4 h-4" /> {vehicles.length} veículos
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
                    : 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200 shadow-md'
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

        {/* ── Stats ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 text-center">
              <s.icon className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ────────────────────────────────────────── */}
        <div className="flex gap-1 mt-4 bg-white rounded-xl p-1 border border-gray-100 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[80px] py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.count != null && (
                <span
                  className={`ml-1 text-xs ${
                    activeTab === tab.id ? 'text-purple-200' : 'text-gray-400'
                  }`}
                >
                  ({tab.count})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab Content ─────────────────────────────────── */}
        <div className="mt-6">
          {/* ─── Início (Featured) ─────────────────────────── */}
          {activeTab === 'featured' && (
            <div className="space-y-6">
              {/* Featured vehicles */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Car className="w-5 h-5 text-purple-600" /> Veículos em Destaque
                </h2>
                {featuredVehicles.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                    <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhum veículo publicado ainda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {featuredVehicles.map(vehicle => (
                      <VehicleCard key={vehicle.id} vehicle={vehicle} />
                    ))}
                  </div>
                )}
              </div>

              {/* Tenho um veículo para troca */}
              {dealerData?.accepts_trade && (
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl p-6 border border-purple-100">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="font-bold text-gray-900 text-lg">Tenho um veículo para troca</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Recebemos seu veículo como parte do pagamento. Avaliação gratuita!
                      </p>
                    </div>
                    <button
                      onClick={handleTradeIn}
                      className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-700 shadow-purple-200 shadow-md whitespace-nowrap"
                    >
                      Avaliar Meu Veículo
                    </button>
                  </div>
                </div>
              )}

              {/* Brands worked */}
              {dealerData?.brands_worked && dealerData.brands_worked.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-3">Marcas que Trabalhamos</h3>
                  <div className="flex flex-wrap gap-2">
                    {dealerData.brands_worked.map(brand => (
                      <span
                        key={brand}
                        className="text-sm font-medium px-4 py-2 rounded-full bg-purple-50 text-purple-700 border border-purple-100"
                      >
                        {brand}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick info cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {dealerData?.has_financing && (
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Financiamento</p>
                      <p className="text-sm text-gray-500">Facilidades de pagamento disponíveis</p>
                    </div>
                  </div>
                )}
                {dealerData?.accepts_trade && (
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Aceita Troca</p>
                      <p className="text-sm text-gray-500">Seu veículo antigo como parte do pagamento</p>
                    </div>
                  </div>
                )}
                {dealerData?.has_delivery && (
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Entrega</p>
                      <p className="text-sm text-gray-500">Entregamos onde você estiver</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Estoque (All Vehicles with Filters) ───────── */}
          {activeTab === 'stock' && (
            <div>
              {/* Filter bar */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      showFilters || activeFilterCount > 0
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    Filtros
                    {activeFilterCount > 0 && (
                      <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  {/* Brand filter */}
                  {filters?.brands && filters.brands.length > 0 && (
                    <select
                      value={filterBrand}
                      onChange={e => setFilterBrand(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Todas as marcas</option>
                      {filters.brands.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  )}

                  {/* Fuel filter */}
                  {filters?.fuels && filters.fuels.length > 0 && (
                    <select
                      value={filterFuel}
                      onChange={e => setFilterFuel(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Todos os combustíveis</option>
                      {filters.fuels.map(f => (
                        <option key={f} value={f}>{FUEL_LABELS[f as keyof typeof FUEL_LABELS] || f}</option>
                      ))}
                    </select>
                  )}

                  {/* Transmission filter */}
                  {filters?.transmissions && filters.transmissions.length > 0 && (
                    <select
                      value={filterTransmission}
                      onChange={e => setFilterTransmission(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Todas as câmbios</option>
                      {filters.transmissions.map(t => (
                        <option key={t} value={t}>{TRANSMISSION_LABELS[t as keyof typeof TRANSMISSION_LABELS] || t}</option>
                      ))}
                    </select>
                  )}

                  {/* Sort */}
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 ml-auto"
                  >
                    <option value="newest">Mais recentes</option>
                    <option value="price_asc">Menor preço</option>
                    <option value="price_desc">Maior preço</option>
                    <option value="year_desc">Mais novos</option>
                  </select>
                </div>

                {/* Expanded filters */}
                {showFilters && (
                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Ano mínimo</label>
                      <input
                        type="number"
                        value={filterMinYear}
                        onChange={e => setFilterMinYear(e.target.value)}
                        placeholder={filters?.min_year?.toString() || ''}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Ano máximo</label>
                      <input
                        type="number"
                        value={filterMaxYear}
                        onChange={e => setFilterMaxYear(e.target.value)}
                        placeholder={filters?.max_year?.toString() || ''}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Preço mín. (R$)</label>
                      <input
                        type="number"
                        value={filterMinPrice}
                        onChange={e => setFilterMinPrice(e.target.value)}
                        placeholder={filters?.min_price?.toString() || ''}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Preço máx. (R$)</label>
                      <input
                        type="number"
                        value={filterMaxPrice}
                        onChange={e => setFilterMaxPrice(e.target.value)}
                        placeholder={filters?.max_price?.toString() || ''}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    {activeFilterCount > 0 && (
                      <div className="col-span-2 sm:col-span-4">
                        <button
                          onClick={handleClearFilters}
                          className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                        >
                          Limpar filtros
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Vehicle grid */}
              {loadingVehicles ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
                      <div className="aspect-[4/3] bg-gray-200" />
                      <div className="p-3 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                        <div className="h-5 bg-gray-200 rounded w-2/3" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : sortedVehicles.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                  <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    {activeFilterCount > 0
                      ? 'Nenhum veículo encontrado com esses filtros.'
                      : 'Nenhum veículo disponível no momento.'}
                  </p>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={handleClearFilters}
                      className="mt-3 text-sm text-purple-600 hover:text-purple-800 font-medium"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedVehicles.map(vehicle => (
                    <VehicleCard key={vehicle.id} vehicle={vehicle} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Sobre ─────────────────────────────────────── */}
          {activeTab === 'about' && (
            <div className="space-y-4">
              {business.description && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-2">Descrição</h3>
                  <p className="text-gray-600 leading-relaxed">{business.description}</p>
                </div>
              )}

              {/* Brands */}
              {dealerData?.brands_worked && dealerData.brands_worked.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Car className="w-5 h-5 text-purple-600" /> Marcas Trabalhadas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {dealerData.brands_worked.map(brand => (
                      <span
                        key={brand}
                        className="text-sm font-medium px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100"
                      >
                        {brand}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Services */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-3">Serviços</h3>
                <div className="flex flex-wrap gap-3">
                  {dealerData?.has_financing && (
                    <span className="text-sm font-medium px-4 py-2 rounded-full bg-green-50 text-green-700 border border-green-100">
                      Financiamento
                    </span>
                  )}
                  {dealerData?.accepts_trade && (
                    <span className="text-sm font-medium px-4 py-2 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
                      Aceita Troca
                    </span>
                  )}
                  {dealerData?.has_delivery && (
                    <span className="text-sm font-medium px-4 py-2 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      Entrega ({dealerData.delivery_reach})
                    </span>
                  )}
                </div>
              </div>

              {/* Location */}
              {(business.city || business.address) && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-purple-600" /> Endereço
                  </h3>
                  <p className="text-sm text-gray-600">
                    {[business.address, business.neighborhood, business.city, business.state]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  {business.lat && business.lng && (
                    <div className="mt-3 aspect-video rounded-xl overflow-hidden bg-gray-100">
                      <iframe
                        title="Localização"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        src={`https://maps.google.com/maps?q=${business.lat},${business.lng}&z=15&output=embed`}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Contact info */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-purple-600" /> Contato
                </h3>
                <div className="space-y-2">
                  {business.phone && (
                    <a
                      href={`tel:${business.phone}`}
                      className="flex items-center gap-3 text-sm text-gray-600 hover:text-purple-600 p-2 rounded-lg hover:bg-gray-50"
                    >
                      <Phone className="w-4 h-4" /> {business.phone}
                    </a>
                  )}
                  {business.whatsapp && (
                    <button
                      onClick={handleWhatsApp}
                      className="flex items-center gap-3 text-sm text-gray-600 hover:text-green-600 p-2 rounded-lg hover:bg-gray-50"
                    >
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-1">Membro desde</h3>
                <p className="text-gray-600">
                  {new Date(business.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          )}

          {/* ─── Avaliações ────────────────────────────────── */}
          {activeTab === 'reviews' && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="text-center py-8">
                <Star className="w-12 h-12 text-yellow-400 fill-yellow-100 mx-auto mb-3" />
                <h3 className="font-bold text-gray-900 text-lg">{business.rating.toFixed(1)} de 5</h3>
                <p className="text-sm text-gray-500 mt-1">Avaliação baseada em reviews dos clientes</p>
              </div>
              {(!(business as any).reviews || (business as any).reviews.length === 0) ? (
                <p className="text-center text-gray-400 text-sm">Nenhuma avaliação ainda.</p>
              ) : (
                <div className="space-y-4 mt-4">
                  {(business as any).reviews.map((review: any, idx: number) => (
                    <div key={idx} className="border-t border-gray-100 pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{review.user_name || 'Anônimo'}</span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-600">{review.comment}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(review.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar Widgets (desktop) ──────────────────── */}
        <div className="hidden lg:block mt-8">
          {/* Financing Simulator */}
          {dealerData?.has_financing && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 max-w-md">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Simulador de Financiamento
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Valor do veículo (R$)</label>
                  <input
                    type="number"
                    value={finVehiclePrice || ''}
                    onChange={e => setFinVehiclePrice(Number(e.target.value))}
                    placeholder="50000"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Entrada (R$)</label>
                  <input
                    type="number"
                    value={finDownPayment || ''}
                    onChange={e => setFinDownPayment(Number(e.target.value))}
                    placeholder="10000"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Parcelas</label>
                  <select
                    value={finInstallments}
                    onChange={e => setFinInstallments(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {[12, 24, 36, 48, 60, 72, 84, 96, 108, 120].map(n => (
                      <option key={n} value={n}>{n}x</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleSimulateFinancing}
                  className="w-full py-2.5 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-700"
                >
                  Simular
                </button>
                {finResult && (
                  <div className="mt-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <p className="text-sm text-gray-600">Valor financiado: <span className="font-bold text-gray-900">{formatPrice(finResult.financed_amount)}</span></p>
                    <p className="text-sm text-gray-600">Parcela estimada: <span className="font-bold text-purple-700 text-lg">{formatPrice(finResult.estimated_monthly)}/mês</span></p>
                    <p className="text-xs text-gray-400 mt-2">{finResult.disclaimer}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Sticky CTA ─────────────────────────────── */}
      <div className="md:hidden fixed bottom-[64px] left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 z-40 flex gap-2">
        <button
          onClick={handleFollow}
          className={`py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
            isFollowing
              ? 'bg-gray-100 text-gray-700 border border-gray-300'
              : 'bg-purple-600 text-white'
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

      {/* ── Test Drive Modal ──────────────────────────────── */}
      {showTestDrive && selectedVehicleId && business && (
        <TestDriveForm
          vehicleId={selectedVehicleId}
          businessId={business.id}
          onClose={() => { setShowTestDrive(false); setSelectedVehicleId(null); }}
        />
      )}

      {/* ── Trade-In Modal ────────────────────────────────── */}
      {showTradeIn && business && (
        <TradeInForm
          businessId={business.id}
          onClose={() => setShowTradeIn(false)}
        />
      )}
    </div>
  );
}

// ── Vehicle Card Component ──────────────────────────────────────
function VehicleCard({ vehicle }: { vehicle: VehicleListing }) {
  return (
    <Link
      href={`/veiculo/${vehicle.id}`}
      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
    >
      <div className="relative aspect-[4/3] bg-gray-100">
        {vehicle.images && vehicle.images.length > 0 ? (
          <img
            src={vehicle.images[0]}
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Car className="w-10 h-10 text-gray-300" />
          </div>
        )}
        <span className="absolute top-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-600 text-white shadow-sm">
          {vehicle.year_model}/{vehicle.year_fabrication}
        </span>
        {vehicle.is_unique_owner && (
          <span className="absolute top-2 right-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-600 text-white shadow-sm">
            Único Dono
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-base font-bold text-purple-600">{formatPrice(vehicle.price)}</p>
        <h3 className="text-sm font-semibold text-gray-800 line-clamp-1 mt-1 group-hover:text-purple-600">
          {vehicle.brand} {vehicle.model} {vehicle.version || ''}
        </h3>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
          {vehicle.mileage != null && (
            <span>{vehicle.mileage.toLocaleString('pt-BR')} km</span>
          )}
          {vehicle.transmission && (
            <span>{TRANSMISSION_LABELS[vehicle.transmission] || vehicle.transmission}</span>
          )}
          {vehicle.fuel && (
            <span className="flex items-center gap-1">
              <FuelIcon className="w-3 h-3" /> {FUEL_LABELS[vehicle.fuel] || vehicle.fuel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          {vehicle.has_financing && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-100">
              Financia
            </span>
          )}
          {vehicle.accepts_trade && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-100">
              Troca
            </span>
          )}
          {vehicle.is_armored && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
              Blindado
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
