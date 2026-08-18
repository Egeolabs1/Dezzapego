'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, Phone, MessageCircle, ShieldCheck, Users, Building2,
  Calendar, Share2, Home, BedDouble, Bath, Maximize, Send,
  Briefcase, MapPinned, Handshake, Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
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
  getRealEstateByBusinessId,
  getAgentsByBusinessId,
  createLead,
  PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
  SPECIALTY_LABELS,
} from '../../lib/realEstate';
import type {
  Business,
  BusinessRealEstate,
  BusinessAgent,
  Ad,
} from '../../types';

type Tab = 'properties' | 'team' | 'about' | 'contact';

export default function RealEstatePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [realEstateData, setRealEstateData] = useState<BusinessRealEstate | null>(null);
  const [agents, setAgents] = useState<BusinessAgent[]>([]);
  const [properties, setProperties] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('properties');
  const [isFollowing, setIsFollowing] = useState(false);

  // Contact form
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  // ── Load real estate data + agents + properties ─────────────────
  useEffect(() => {
    if (!business) return;

    async function loadExtra() {
      const [reData, agentData] = await Promise.all([
        getRealEstateByBusinessId(business!.id),
        getAgentsByBusinessId(business!.id),
      ]);
      setRealEstateData(reData);
      setAgents(agentData);

      const { data: adData } = await supabase
        .from('ads')
        .select('*')
        .eq('business_id', business!.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(60);
      setProperties((adData || []) as Ad[]);
    }
    loadExtra();
  }, [business]);

  // ── Follow check ────────────────────────────────────────────────
  useEffect(() => {
    if (!business || !user) return;
    isFollowingBusiness(business.id).then(setIsFollowing);
  }, [business, user]);

  // ── Handlers ────────────────────────────────────────────────────
  const handleFollow = async () => {
    if (!user) {
      toast.error('Faça login para seguir esta imobiliária.');
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
        toast.success('Agora você segue esta imobiliária!');
      }
    } catch {
      toast.error('Erro ao processar.');
    }
  };

  const handleWhatsApp = () => {
    if (!business?.whatsapp) return;
    const phone = business.whatsapp.replace(/\D/g, '');
    const msg = encodeURIComponent(
      realEstateData?.whatsapp_message ||
        `Olá! Vim pelo Dezzapego e tenho interesse nos imóveis da ${business!.name}.`,
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

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    if (!formName.trim() || !formPhone.trim()) {
      toast.error('Preencha nome e telefone.');
      return;
    }
    setSubmitting(true);
    try {
      await createLead({
        business_id: business.id,
        buyer_name: formName.trim(),
        buyer_phone: formPhone.trim(),
        buyer_email: formEmail.trim() || undefined,
        buyer_whatsapp: formPhone.trim(),
        message: formMessage.trim() || undefined,
        source: 'form',
      });
      toast.success('Mensagem enviada! A imobiliária entrará em contato.');
      setFormName('');
      setFormPhone('');
      setFormEmail('');
      setFormMessage('');
    } catch {
      toast.error('Erro ao enviar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAgentWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleaned}`, '_blank');
  };

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
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Imobiliária não encontrada</h1>
          <p className="text-gray-500 mb-6">Esta imobiliária não existe ou foi desativada.</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  // ── Derived stats ───────────────────────────────────────────────
  const stats = [
    { label: 'Imóveis', value: properties.length, icon: Building2 },
    { label: 'Seguidores', value: business.followers_count, icon: Users },
    {
      label: 'Experiência',
      value: realEstateData?.years_experience ? `${realEstateData.years_experience} anos` : '—',
      icon: Calendar,
    },
    { label: 'Vendidos', value: realEstateData?.properties_sold ?? 0, icon: Handshake },
  ];

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'properties', label: 'Imóveis', count: properties.length },
    { id: 'team', label: 'Equipe', count: agents.length },
    { id: 'about', label: 'Sobre' },
    { id: 'contact', label: 'Contato' },
  ];

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="bg-gray-50 min-h-screen pb-24 md:pb-12">
      <SEO
        title={business.name}
        description={
          realEstateData?.specialties?.length
            ? `${business.name} — ${realEstateData.specialties.map(s => SPECIALTY_LABELS[s] || s).join(', ')}`
            : `${business.name} no Dezzapego`
        }
        image={business.cover_url || business.logo_url || undefined}
        type="website"
      />
      <Header />

      {/* ── Cover ─────────────────────────────────────────── */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-blue-600 to-cyan-500 overflow-hidden">
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
                <span className="text-2xl font-bold text-blue-600">{business.name.charAt(0)}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
                {business.verification_status === 'verified' && (
                  <span title="Empresa Verificada">
                    <ShieldCheck className="w-6 h-6 text-blue-600 fill-blue-100" />
                  </span>
                )}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  Imobiliária
                </span>
                {realEstateData?.creci && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
                    CRECI {realEstateData.creci_type === 'pj' ? 'J' : 'F'}-{realEstateData.creci}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                {business.city && business.state && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {business.city}, {business.state}
                  </span>
                )}
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

        {/* ── Stats ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 text-center">
              <s.icon className="w-5 h-5 text-blue-600 mx-auto mb-1" />
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
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.count != null && (
                <span
                  className={`ml-1 text-xs ${
                    activeTab === tab.id ? 'text-blue-200' : 'text-gray-400'
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
          {/* ─── Imóveis ───────────────────────────────────── */}
          {activeTab === 'properties' && (
            <div>
              {properties.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                  <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhum imóvel publicado ainda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {properties.map(ad => (
                    <Link
                      key={ad.id}
                      href={`/anuncio/${ad.id}`}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
                    >
                      <div className="relative aspect-[4/3] bg-gray-100">
                        <img
                          src={ad.images?.[0]}
                          alt={ad.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {/* Type badge */}
                        {ad.property_type && (
                          <span className="absolute top-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-sm">
                            {PROPERTY_TYPE_LABELS[ad.property_type] || ad.property_type}
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-base font-bold text-blue-600">{formatPrice(ad.price)}</p>
                        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mt-1 group-hover:text-blue-600">
                          {ad.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          {ad.bedrooms != null && (
                            <span className="flex items-center gap-1">
                              <BedDouble className="w-3.5 h-3.5" /> {ad.bedrooms} quartos
                            </span>
                          )}
                          {ad.bathrooms != null && (
                            <span className="flex items-center gap-1">
                              <Bath className="w-3.5 h-3.5" /> {ad.bathrooms} banh.
                            </span>
                          )}
                          {ad.area_m2 != null && (
                            <span className="flex items-center gap-1">
                              <Maximize className="w-3.5 h-3.5" /> {ad.area_m2} m²
                            </span>
                          )}
                        </div>
                        {ad.location?.neighborhood && (
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {ad.location.neighborhood},{' '}
                            {ad.location.city}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Equipe ────────────────────────────────────── */}
          {activeTab === 'team' && (
            <div>
              {agents.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhum corretor cadastrado ainda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {agents.map(agent => (
                    <Link
                      key={agent.id}
                      href={`/corretor/${agent.id}`}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow group"
                    >
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden shrink-0">
                          {agent.avatar_url ? (
                            <img
                              src={agent.avatar_url}
                              alt={agent.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-bold text-blue-600">
                              {agent.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 truncate">
                            {agent.name}
                          </h3>
                          {agent.creci && (
                            <p className="text-xs text-green-600 font-medium">
                              CRECI {agent.creci_type === 'pj' ? 'J' : 'F'}-{agent.creci}
                            </p>
                          )}
                        </div>
                      </div>
                      {agent.bio && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{agent.bio}</p>
                      )}
                      <div className="flex items-center gap-2">
                        {agent.phone && (
                          <a
                            href={`tel:${agent.phone}`}
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            <Phone className="w-3.5 h-3.5" /> Ligar
                          </a>
                        )}
                        {agent.whatsapp && (
                          <button
                            onClick={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAgentWhatsApp(agent.whatsapp!);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700 hover:bg-green-100"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                          </button>
                        )}
                      </div>
                    </Link>
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

              {realEstateData?.specialties && realEstateData.specialties.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-600" /> Especialidades
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {realEstateData.specialties.map(s => (
                      <span
                        key={s}
                        className="text-xs font-medium px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100"
                      >
                        {SPECIALTY_LABELS[s] || s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {realEstateData?.regions && realEstateData.regions.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <MapPinned className="w-5 h-5 text-blue-600" /> Regiões Atendidas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {realEstateData.regions.map(r => (
                      <span
                        key={r}
                        className="text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-700"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {realEstateData?.transaction_types && realEstateData.transaction_types.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Handshake className="w-5 h-5 text-blue-600" /> Tipos de Transação
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {realEstateData.transaction_types.map(t => (
                      <span
                        key={t}
                        className="text-xs font-medium px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-100"
                      >
                        {TRANSACTION_TYPE_LABELS[t] || t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Location */}
              {(business.city || business.address) && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" /> Endereço
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

              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-1">Membro desde</h3>
                <p className="text-gray-600">
                  {new Date(business.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          )}

          {/* ─── Contato ───────────────────────────────────── */}
          {activeTab === 'contact' && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" /> Envie uma mensagem
              </h3>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
                  <textarea
                    value={formMessage}
                    onChange={e => setFormMessage(e.target.value)}
                    placeholder="Olá, tenho interesse em..."
                    rows={4}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Enviando...' : 'Enviar Mensagem'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Sticky CTA ─────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 z-40 flex gap-2">
        <button
          onClick={handleFollow}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
            isFollowing
              ? 'bg-gray-100 text-gray-700 border border-gray-300'
              : 'bg-blue-600 text-white'
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
