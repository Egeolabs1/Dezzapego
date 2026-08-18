'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, ExternalLink, Building2, Users, CalendarClock, Eye,
  Phone, MessageCircle, Pencil, Plus, Trash2, Check, X,
  ChevronDown, UserPlus, Settings, Home,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../../components/SEO';
import {
  getRealEstateByBusinessId,
  upsertRealEstate,
  getAgentsByBusinessId,
  addAgent,
  updateAgent,
  removeAgent,
  getLeadsByBusinessId,
  updateLeadStatus,
  getLeadsCountToday,
  getVisitsByBusinessId,
  updateVisitStatus,
  getPendingVisitsCount,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  VISIT_STATUS_LABELS,
  VISIT_STATUS_COLORS,
} from '../../lib/realEstate';
import type {
  Business,
  BusinessRealEstate,
  BusinessAgent,
  PropertyLead,
  PropertyVisit,
  LeadStatus,
  VisitStatus,
  Ad,
} from '../../types';

type DashboardTab = 'overview' | 'properties' | 'leads' | 'visits' | 'team' | 'settings';

export default function RealEstateDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [, setRealEstateData] = useState<BusinessRealEstate | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Data
  const [ads, setAds] = useState<Ad[]>([]);
  const [agents, setAgents] = useState<BusinessAgent[]>([]);
  const [leads, setLeads] = useState<PropertyLead[]>([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [visits, setVisits] = useState<PropertyVisit[]>([]);
  const [leadsToday, setLeadsToday] = useState(0);
  const [pendingVisits, setPendingVisits] = useState(0);

  // Filters
  const [leadStatusFilter, setLeadStatusFilter] = useState<LeadStatus | ''>('');
  const [visitStatusFilter, setVisitStatusFilter] = useState<VisitStatus | ''>('');

  // Agent form
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<BusinessAgent | null>(null);
  const [agentForm, setAgentForm] = useState({
    name: '',
    creci: '',
    creci_type: 'pf' as 'pf' | 'pj',
    phone: '',
    whatsapp: '',
    email: '',
    bio: '',
  });

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    creci: '',
    creci_type: 'pj' as 'pj' | 'pf',
    specialties: [] as string[],
    regions: [] as string[],
    transaction_types: [] as string[],
    years_experience: '',
    properties_sold: '',
    whatsapp_message: '',
  });

  // ── Auth guard ──────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    async function load() {
      const { data: bizData } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user!.id)
        .eq('type', 'real_estate')
        .eq('is_active', true)
        .maybeSingle();

      if (!bizData) {
        setLoading(false);
        return;
      }

      const b = bizData as Business;
      setBusiness(b);

      // Load all data in parallel
      const [reData, agentData, leadResult, visitResult, ltToday, pvCount] = await Promise.all([
        getRealEstateByBusinessId(b.id),
        getAgentsByBusinessId(b.id),
        getLeadsByBusinessId(b.id, { limit: 20 }),
        getVisitsByBusinessId(b.id, { limit: 20 }),
        getLeadsCountToday(b.id),
        getPendingVisitsCount(b.id),
      ]);

      setRealEstateData(reData);
      setAgents(agentData);
      setLeads(leadResult.leads);
      setLeadsTotal(leadResult.total);
      setVisits(visitResult.visits);
      setLeadsToday(ltToday);
      setPendingVisits(pvCount);

      // Load ads
      const { data: adData } = await supabase
        .from('ads')
        .select('*')
        .eq('business_id', b.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setAds((adData || []) as Ad[]);

      // Populate settings form
      if (reData) {
        setSettingsForm({
          creci: reData.creci || '',
          creci_type: reData.creci_type || 'pj',
          specialties: reData.specialties || [],
          regions: reData.regions || [],
          transaction_types: reData.transaction_types || [],
          years_experience: reData.years_experience?.toString() || '',
          properties_sold: reData.properties_sold?.toString() || '',
          whatsapp_message: reData.whatsapp_message || '',
        });
      }

      setLoading(false);
    }

    load();
  }, [user, authLoading, router]);

  // ── Reload leads ────────────────────────────────────────────────
  const reloadLeads = useCallback(async () => {
    if (!business) return;
    const status = leadStatusFilter || undefined;
    const result = await getLeadsByBusinessId(business.id, {
      status: status as LeadStatus | undefined,
      limit: 50,
    });
    setLeads(result.leads);
    setLeadsTotal(result.total);
  }, [business, leadStatusFilter]);

  useEffect(() => {
    reloadLeads();
  }, [leadStatusFilter, reloadLeads]);

  // ── Reload visits ───────────────────────────────────────────────
  const reloadVisits = useCallback(async () => {
    if (!business) return;
    const status = visitStatusFilter || undefined;
    const result = await getVisitsByBusinessId(business.id, {
      status: status as VisitStatus | undefined,
      limit: 50,
    });
    setVisits(result.visits);
  }, [business, visitStatusFilter]);

  useEffect(() => {
    reloadVisits();
  }, [visitStatusFilter, reloadVisits]);

  // ── Handlers ────────────────────────────────────────────────────
  const handleLeadStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    try {
      await updateLeadStatus(leadId, newStatus);
      setLeads(prev =>
        prev.map(l => (l.id === leadId ? { ...l, status: newStatus } : l)),
      );
      toast.success('Status atualizado!');
    } catch {
      toast.error('Erro ao atualizar status.');
    }
  };

  const handleVisitStatusChange = async (visitId: string, newStatus: VisitStatus) => {
    try {
      await updateVisitStatus(visitId, newStatus);
      setVisits(prev =>
        prev.map(v => (v.id === visitId ? { ...v, status: newStatus } : v)),
      );
      toast.success('Status da visita atualizado!');
      // Refresh pending count
      if (business) {
        const pv = await getPendingVisitsCount(business.id);
        setPendingVisits(pv);
      }
    } catch {
      toast.error('Erro ao atualizar status.');
    }
  };

  // ── Agent CRUD ──────────────────────────────────────────────────
  const openAgentForm = (agent?: BusinessAgent) => {
    if (agent) {
      setEditingAgent(agent);
      setAgentForm({
        name: agent.name,
        creci: agent.creci || '',
        creci_type: agent.creci_type || 'pf',
        phone: agent.phone || '',
        whatsapp: agent.whatsapp || '',
        email: agent.email || '',
        bio: agent.bio || '',
      });
    } else {
      setEditingAgent(null);
      setAgentForm({ name: '', creci: '', creci_type: 'pf', phone: '', whatsapp: '', email: '', bio: '' });
    }
    setShowAgentForm(true);
  };

  const handleSaveAgent = async () => {
    if (!business) return;
    if (!agentForm.name.trim()) {
      toast.error('Nome é obrigatório.');
      return;
    }
    try {
      if (editingAgent) {
        await updateAgent(editingAgent.id, {
          name: agentForm.name.trim(),
          creci: agentForm.creci.trim() || null,
          creci_type: agentForm.creci_type,
          phone: agentForm.phone.trim() || null,
          whatsapp: agentForm.whatsapp.trim() || null,
          email: agentForm.email.trim() || null,
          bio: agentForm.bio.trim() || null,
        });
        toast.success('Corretor atualizado!');
      } else {
        await addAgent({
          business_id: business.id,
          user_id: null,
          name: agentForm.name.trim(),
          creci: agentForm.creci.trim() || null,
          creci_type: agentForm.creci_type,
          phone: agentForm.phone.trim() || null,
          whatsapp: agentForm.whatsapp.trim() || null,
          email: agentForm.email.trim() || null,
          avatar_url: null,
          bio: agentForm.bio.trim() || null,
          specialties: [],
          regions: [],
          is_active: true,
          sort_order: agents.length,
        });
        toast.success('Corretor adicionado!');
      }
      setShowAgentForm(false);
      const updated = await getAgentsByBusinessId(business.id);
      setAgents(updated);
    } catch {
      toast.error('Erro ao salvar corretor.');
    }
  };

  const handleRemoveAgent = async (agentId: string) => {
    if (!confirm('Remover este corretor?')) return;
    try {
      await removeAgent(agentId);
      setAgents(prev => prev.filter(a => a.id !== agentId));
      toast.success('Corretor removido.');
    } catch {
      toast.error('Erro ao remover corretor.');
    }
  };

  // ── Settings save ───────────────────────────────────────────────
  const handleSaveSettings = async () => {
    if (!business) return;
    try {
      await upsertRealEstate(business.id, {
        creci: settingsForm.creci.trim() || null,
        creci_type: settingsForm.creci_type,
        specialties: settingsForm.specialties,
        regions: settingsForm.regions,
        transaction_types: settingsForm.transaction_types,
        years_experience: settingsForm.years_experience
          ? Number(settingsForm.years_experience)
          : null,
        properties_sold: settingsForm.properties_sold
          ? Number(settingsForm.properties_sold)
          : 0,
        whatsapp_message: settingsForm.whatsapp_message.trim(),
      });
      toast.success('Configurações salvas!');
    } catch {
      toast.error('Erro ao salvar configurações.');
    }
  };

  const toggleArrayField = (
    field: 'specialties' | 'regions' | 'transaction_types',
    value: string,
  ) => {
    setSettingsForm(prev => {
      const arr = prev[field];
      const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      return { ...prev, [field]: next };
    });
  };

  // ── Loading ─────────────────────────────────────────────────────
  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ── No business ─────────────────────────────────────────────────
  if (!business) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Você ainda não tem uma imobiliária</h1>
          <p className="text-gray-500 mb-6">Crie sua página profissional no Dezzapego.</p>
          <Link
            href="/business/nova"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700"
          >
            Criar Imobiliária
          </Link>
        </div>
      </div>
    );
  }

  // ── Tabs ────────────────────────────────────────────────────────
  const tabs: { id: DashboardTab; label: string }[] = [
    { id: 'overview', label: 'Visão Geral' },
    { id: 'properties', label: 'Imóveis' },
    { id: 'leads', label: 'Leads' },
    { id: 'visits', label: 'Visitas' },
    { id: 'team', label: 'Equipe' },
    { id: 'settings', label: 'Configurações' },
  ];

  const statCards = [
    { label: 'Imóveis', value: ads.length, icon: Building2, color: 'text-blue-600 bg-blue-50' },
    { label: 'Leads Hoje', value: leadsToday, icon: Users, color: 'text-green-600 bg-green-50' },
    { label: 'Visitas Pendentes', value: pendingVisits, icon: CalendarClock, color: 'text-orange-600 bg-orange-50' },
    { label: 'Seguidores', value: business.followers_count, icon: Eye, color: 'text-purple-600 bg-purple-50' },
  ];

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="bg-gray-50 min-h-screen">
      <SEO title={`Dashboard Imobiliária — ${business.name}`} description="Painel de gerenciamento" noIndex />
      <Header />

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center overflow-hidden">
              {business.logo_url ? (
                <img src={business.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-blue-600">{business.name.charAt(0)}</span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{business.name}</h1>
              <p className="text-sm text-gray-500">Imobiliária</p>
            </div>
          </div>
          <Link
            href={`/imobiliaria/${business.slug}`}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            <ExternalLink className="w-4 h-4" /> Ver Página Pública
          </Link>
        </div>

        {/* ── Stats ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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

        {/* ── Tabs ────────────────────────────────────────── */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-100 overflow-x-auto mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[100px] py-2.5 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════
            TAB CONTENT
            ════════════════════════════════════════════════════ */}

        {/* ─── Visão Geral ─────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-sm text-gray-500">Total Leads</p>
                <p className="text-xl font-bold text-gray-900">{leadsTotal}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-sm text-gray-500">Leads Hoje</p>
                <p className="text-xl font-bold text-green-600">{leadsToday}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-sm text-gray-500">Visitas Pendentes</p>
                <p className="text-xl font-bold text-orange-600">{pendingVisits}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-sm text-gray-500">Corretores</p>
                <p className="text-xl font-bold text-blue-600">{agents.length}</p>
              </div>
            </div>

            {/* Recent Leads */}
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900">Leads Recentes</h2>
                <button
                  onClick={() => setActiveTab('leads')}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Ver todos
                </button>
              </div>
              {leads.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">Nenhum lead registrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 text-gray-500 font-medium">Nome</th>
                        <th className="text-left py-2 text-gray-500 font-medium">Telefone</th>
                        <th className="text-left py-2 text-gray-500 font-medium">Status</th>
                        <th className="text-left py-2 text-gray-500 font-medium">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.slice(0, 5).map(lead => (
                        <tr key={lead.id} className="border-b border-gray-50">
                          <td className="py-2.5 text-gray-900 font-medium">{lead.buyer_name}</td>
                          <td className="py-2.5 text-gray-600">{lead.buyer_phone}</td>
                          <td className="py-2.5">
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                LEAD_STATUS_COLORS[lead.status]
                              }`}
                            >
                              {LEAD_STATUS_LABELS[lead.status]}
                            </span>
                          </td>
                          <td className="py-2.5 text-gray-400 text-xs">
                            {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Imóveis ────────────────────────────────────── */}
        {activeTab === 'properties' && (
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Imóveis ({ads.length})</h2>
              <Link
                href="/anunciar"
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" /> Novo Imóvel
              </Link>
            </div>
            {ads.length === 0 ? (
              <div className="text-center py-12">
                <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum imóvel publicado.</p>
                <Link href="/anunciar" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                  Publicar primeiro imóvel
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {ads.map(ad => (
                  <Link
                    key={ad.id}
                    href={`/anuncio/${ad.id}`}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                      <img src={ad.images?.[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{ad.title}</p>
                      <p className="text-sm font-bold text-blue-600">
                        R$ {ad.price.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-xs text-gray-400">
                        {ad.bedrooms != null ? `${ad.bedrooms} quartos` : ''}
                        {ad.area_m2 != null ? ` · ${ad.area_m2} m²` : ''}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      <p>{ad.views || 0} views</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Leads ──────────────────────────────────────── */}
        {activeTab === 'leads' && (
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="font-bold text-gray-900">Leads ({leadsTotal})</h2>
              <div className="relative">
                <select
                  value={leadStatusFilter}
                  onChange={e => setLeadStatusFilter(e.target.value as LeadStatus | '')}
                  className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os status</option>
                  {Object.entries(LEAD_STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {leads.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Nenhum lead encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-gray-500 font-medium">Nome</th>
                      <th className="text-left py-2 text-gray-500 font-medium">Telefone</th>
                      <th className="text-left py-2 text-gray-500 font-medium">E-mail</th>
                      <th className="text-left py-2 text-gray-500 font-medium">Mensagem</th>
                      <th className="text-left py-2 text-gray-500 font-medium">Status</th>
                      <th className="text-left py-2 text-gray-500 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(lead => (
                      <tr key={lead.id} className="border-b border-gray-50">
                        <td className="py-2.5 text-gray-900 font-medium whitespace-nowrap">
                          {lead.buyer_name}
                        </td>
                        <td className="py-2.5 text-gray-600 whitespace-nowrap">
                          {lead.buyer_phone && (
                            <a href={`tel:${lead.buyer_phone}`} className="hover:text-blue-600 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {lead.buyer_phone}
                            </a>
                          )}
                        </td>
                        <td className="py-2.5 text-gray-500 text-xs max-w-[140px] truncate">
                          {lead.buyer_email || '—'}
                        </td>
                        <td className="py-2.5 text-gray-500 text-xs max-w-[180px] truncate">
                          {lead.message || '—'}
                        </td>
                        <td className="py-2.5">
                          <div className="relative">
                            <select
                              value={lead.status}
                              onChange={e =>
                                handleLeadStatusChange(lead.id, e.target.value as LeadStatus)
                              }
                              className={`appearance-none text-[11px] font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${
                                LEAD_STATUS_COLORS[lead.status]
                              }`}
                            >
                              {Object.entries(LEAD_STATUS_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="py-2.5 text-gray-400 text-xs whitespace-nowrap">
                          {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── Visitas ────────────────────────────────────── */}
        {activeTab === 'visits' && (
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="font-bold text-gray-900">Visitas</h2>
              <div className="relative">
                <select
                  value={visitStatusFilter}
                  onChange={e => setVisitStatusFilter(e.target.value as VisitStatus | '')}
                  className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os status</option>
                  {Object.entries(VISIT_STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {visits.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Nenhuma visita encontrada.</p>
            ) : (
              <div className="space-y-3">
                {visits.map(visit => (
                  <div
                    key={visit.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <CalendarClock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{visit.buyer_name}</p>
                      <p className="text-xs text-gray-500">
                        {visit.buyer_phone} · {visit.visit_date} às {visit.visit_time}
                      </p>
                      {visit.notes && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{visit.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={visit.status}
                        onChange={e =>
                          handleVisitStatusChange(visit.id, e.target.value as VisitStatus)
                        }
                        className={`appearance-none text-[11px] font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${
                          VISIT_STATUS_COLORS[visit.status]
                        }`}
                      >
                        {Object.entries(VISIT_STATUS_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                      {visit.buyer_phone && (
                        <a
                          href={`https://wa.me/55${visit.buyer_phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-green-50 text-green-600"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Equipe ─────────────────────────────────────── */}
        {activeTab === 'team' && (
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Equipe ({agents.length})</h2>
              <button
                onClick={() => openAgentForm()}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <UserPlus className="w-4 h-4" /> Adicionar Corretor
              </button>
            </div>

            {/* Agent Form Modal */}
            {showAgentForm && (
              <div className="mb-6 bg-blue-50 rounded-xl p-5 border border-blue-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">
                    {editingAgent ? 'Editar Corretor' : 'Novo Corretor'}
                  </h3>
                  <button onClick={() => setShowAgentForm(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Nome <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={agentForm.name}
                      onChange={e => setAgentForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">CRECI</label>
                      <input
                        type="text"
                        value={agentForm.creci}
                        onChange={e => setAgentForm(prev => ({ ...prev, creci: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    <div className="w-20">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                      <select
                        value={agentForm.creci_type}
                        onChange={e =>
                          setAgentForm(prev => ({
                            ...prev,
                            creci_type: e.target.value as 'pf' | 'pj',
                          }))
                        }
                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="pf">PF</option>
                        <option value="pj">PJ</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                    <input
                      type="tel"
                      value={agentForm.phone}
                      onChange={e => setAgentForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp</label>
                    <input
                      type="tel"
                      value={agentForm.whatsapp}
                      onChange={e => setAgentForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
                    <input
                      type="email"
                      value={agentForm.email}
                      onChange={e => setAgentForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Bio</label>
                    <textarea
                      value={agentForm.bio}
                      onChange={e => setAgentForm(prev => ({ ...prev, bio: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={handleSaveAgent}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Check className="w-4 h-4" /> Salvar
                  </button>
                  <button
                    onClick={() => setShowAgentForm(false)}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Agent list */}
            {agents.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum corretor cadastrado.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {agents.map(agent => (
                  <div
                    key={agent.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden shrink-0">
                      {agent.avatar_url ? (
                        <img src={agent.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-blue-600">
                          {agent.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{agent.name}</p>
                      <p className="text-xs text-green-600">
                        {agent.creci
                          ? `CRECI ${agent.creci_type === 'pj' ? 'J' : 'F'}-${agent.creci}`
                          : 'Sem CRECI'}
                      </p>
                      {agent.phone && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {agent.phone}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openAgentForm(agent)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveAgent(agent.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Configurações ──────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl p-6 border border-gray-100 space-y-6">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" /> Configurações da Imobiliária
            </h2>

            {/* CRECI */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CRECI</label>
                <input
                  type="text"
                  value={settingsForm.creci}
                  onChange={e => setSettingsForm(prev => ({ ...prev, creci: e.target.value }))}
                  placeholder="Número CRECI"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo CRECI</label>
                <select
                  value={settingsForm.creci_type}
                  onChange={e =>
                    setSettingsForm(prev => ({
                      ...prev,
                      creci_type: e.target.value as 'pj' | 'pf',
                    }))
                  }
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pj">Jurídica (PJ)</option>
                  <option value="pf">Física (PF)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Anos de Experiência</label>
                <input
                  type="number"
                  value={settingsForm.years_experience}
                  onChange={e =>
                    setSettingsForm(prev => ({ ...prev, years_experience: e.target.value }))
                  }
                  placeholder="Ex: 10"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Properties sold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Imóveis Vendidos</label>
              <input
                type="number"
                value={settingsForm.properties_sold}
                onChange={e =>
                  setSettingsForm(prev => ({ ...prev, properties_sold: e.target.value }))
                }
                placeholder="Ex: 150"
                className="w-full max-w-xs px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Specialties */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Especialidades</label>
              <div className="flex flex-wrap gap-2">
                {(['residencial', 'comercial', 'loteamento', 'rural', 'industrial'] as const).map(
                  s => (
                    <button
                      key={s}
                      onClick={() => toggleArrayField('specialties', s)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        settingsForm.specialties.includes(s)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Transaction types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipos de Transação
              </label>
              <div className="flex flex-wrap gap-2">
                {(['sale', 'rent', 'seasonal', 'launch'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => toggleArrayField('transaction_types', t)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      settingsForm.transaction_types.includes(t)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {t === 'sale'
                      ? 'Venda'
                      : t === 'rent'
                        ? 'Aluguel'
                        : t === 'seasonal'
                          ? 'Temporada'
                          : 'Lançamento'}
                  </button>
                ))}
              </div>
            </div>

            {/* Regions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Regiões / Bairros Atendidos
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {settingsForm.regions.map((r, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm border border-blue-100"
                  >
                    {r}
                    <button
                      onClick={() =>
                        setSettingsForm(prev => ({
                          ...prev,
                          regions: prev.regions.filter((_, idx) => idx !== i),
                        }))
                      }
                      className="text-blue-400 hover:text-blue-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="addRegion"
                  placeholder="Adicionar bairro..."
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val && !settingsForm.regions.includes(val)) {
                        setSettingsForm(prev => ({ ...prev, regions: [...prev.regions, val] }));
                      }
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('addRegion') as HTMLInputElement;
                    const val = input?.value.trim();
                    if (val && !settingsForm.regions.includes(val)) {
                      setSettingsForm(prev => ({ ...prev, regions: [...prev.regions, val] }));
                    }
                    if (input) input.value = '';
                  }}
                  className="px-4 py-2.5 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200 text-gray-700"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* WhatsApp message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensagem Padrão do WhatsApp
              </label>
              <textarea
                value={settingsForm.whatsapp_message}
                onChange={e =>
                  setSettingsForm(prev => ({ ...prev, whatsapp_message: e.target.value }))
                }
                placeholder="Mensagem que será enviada ao clicar no botão WhatsApp..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Save */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveSettings}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700"
              >
                <Check className="w-4 h-4" /> Salvar Configurações
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
