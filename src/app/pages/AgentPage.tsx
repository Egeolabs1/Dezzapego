'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Phone, MessageCircle, Home, BedDouble, Bath, Maximize,
  MapPin, Briefcase, MapPinned, ArrowLeft,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Header } from '../components/Header';
import SEO from '../../components/SEO';
import { formatPrice } from '../../lib/formatters';
import { SPECIALTY_LABELS } from '../../lib/realEstate';
import type { BusinessAgent, Ad } from '../../types';

export default function AgentPage() {
  const { id } = useParams<{ id: string }>();

  const [agent, setAgent] = useState<BusinessAgent | null>(null);
  const [properties, setProperties] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;

      // Fetch agent
      const { data: agentData, error: agentErr } = await supabase
        .from('business_agents')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .maybeSingle();

      if (agentErr || !agentData) {
        setLoading(false);
        return;
      }

      setAgent(agentData as BusinessAgent);

      // Fetch properties linked to this agent
      const { data: adData } = await supabase
        .from('ads')
        .select('*')
        .eq('agent_id', id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);

      setProperties((adData || []) as Ad[]);
      setLoading(false);
    }

    load();
  }, [id]);

  const handleWhatsApp = () => {
    if (!agent?.whatsapp) return;
    const phone = agent.whatsapp.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá! Vim pelo Dezzapego e tenho interesse em um imóvel.`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
  };

  // ── Loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded-2xl" />
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  // ── Not found ───────────────────────────────────────────────────
  if (!agent) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Corretor não encontrado</h1>
          <p className="text-gray-500 mb-6">Este corretor não existe ou foi desativado.</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <SEO
        title={`${agent.name} — Corretor`}
        description={
          agent.bio || `${agent.name} — Corretor de imóveis no Dezzapego`
        }
        image={agent.avatar_url || undefined}
        type="website"
      />
      <Header />

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        {/* ── Profile Card ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden shrink-0 mx-auto sm:mx-0">
              {agent.avatar_url ? (
                <img
                  src={agent.avatar_url}
                  alt={agent.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-blue-600">{agent.name.charAt(0)}</span>
              )}
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
              {agent.creci && (
                <p className="text-sm text-green-600 font-semibold mt-0.5">
                  CRECI {agent.creci_type === 'pj' ? 'J' : 'F'}-{agent.creci}
                </p>
              )}
              {agent.bio && (
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">{agent.bio}</p>
              )}
            </div>
          </div>

          {/* ── Stats ──────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            {agent.specialties && agent.specialties.length > 0 && (
              <div className="bg-blue-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">Especialidades</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {agent.specialties.map(s => (
                    <span
                      key={s}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white text-blue-700 border border-blue-100"
                    >
                      {SPECIALTY_LABELS[s] || s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {agent.regions && agent.regions.length > 0 && (
              <div className="bg-cyan-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <MapPinned className="w-4 h-4 text-cyan-600" />
                  <span className="text-xs font-medium text-cyan-700">Regiões</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {agent.regions.map(r => (
                    <span
                      key={r}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white text-cyan-700 border border-cyan-100"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Contact Buttons ────────────────────────────── */}
          <div className="flex items-center gap-3 mt-6">
            {agent.phone && (
              <a
                href={`tel:${agent.phone}`}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Phone className="w-4 h-4" /> Ligar
              </a>
            )}
            {agent.whatsapp && (
              <button
                onClick={handleWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 shadow-green-200 shadow-md transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </button>
            )}
          </div>
        </div>

        {/* ── Properties ──────────────────────────────────── */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Home className="w-5 h-5 text-blue-600" /> Imóveis ({properties.length})
          </h2>

          {properties.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum imóvel publicado por este corretor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    {ad.property_type && (
                      <span className="absolute top-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-sm">
                        {ad.property_type}
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
      </div>
    </div>
  );
}
