'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, ArrowLeft, Plus, X, ChevronDown, ChevronUp, Search,
  Phone, MessageCircle, Mail, Calendar, User, FileText, History,
  Filter, AlertCircle, Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../../components/SEO';
import {
  getLeadsByBusiness,
  updateLeadStatus,
  addLeadNote,
  createLead,
  getLeadWithNotes,
} from '../../lib/crm';
import {
  LEAD_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
} from '../../types';
import type {
  Business,
  Lead,
  LeadStatus,
  LeadSource,
  LeadWithNotes,
} from '../../types';

// ── Pipeline column definitions ──────────────────────────────
type PipelineColumn = {
  id: LeadStatus;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
};

const PIPELINE_COLUMNS: PipelineColumn[] = [
  { id: 'novo',        label: 'Novo',           color: 'text-violet-700', bgColor: 'bg-violet-50', borderColor: 'border-violet-200', dotColor: 'bg-violet-500' },
  { id: 'contatado',   label: 'Contatado',      color: 'text-blue-700',   bgColor: 'bg-blue-50',   borderColor: 'border-blue-200',   dotColor: 'bg-blue-500' },
  { id: 'negociando',  label: 'Negociando',     color: 'text-amber-700',  bgColor: 'bg-amber-50',  borderColor: 'border-amber-200',  dotColor: 'bg-amber-500' },
  { id: 'visita',      label: 'Visita/Test Drive', color: 'text-cyan-700', bgColor: 'bg-cyan-50',   borderColor: 'border-cyan-200',   dotColor: 'bg-cyan-500' },
  { id: 'proposta',    label: 'Proposta',       color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', dotColor: 'bg-orange-500' },
  { id: 'vendido',     label: 'Vendido',        color: 'text-green-700',  bgColor: 'bg-green-50',  borderColor: 'border-green-200',  dotColor: 'bg-green-500' },
  { id: 'perdido',     label: 'Perdido',        color: 'text-red-700',    bgColor: 'bg-red-50',    borderColor: 'border-red-200',    dotColor: 'bg-red-500' },
];

const STATUS_ORDER: LeadStatus[] = PIPELINE_COLUMNS.map(c => c.id);

const SOURCE_COLORS: Record<string, string> = {
  whatsapp: 'bg-green-100 text-green-700',
  visita: 'bg-blue-100 text-blue-700',
  test_drive: 'bg-cyan-100 text-cyan-700',
  trade_in: 'bg-amber-100 text-amber-700',
  chat: 'bg-purple-100 text-purple-700',
  telefone: 'bg-indigo-100 text-indigo-700',
  formulario: 'bg-pink-100 text-pink-700',
  manual: 'bg-gray-100 text-gray-700',
  outro: 'bg-slate-100 text-slate-700',
};

export default function LeadPipeline() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // ── State ──────────────────────────────────────────────────
  const [business, setBusiness] = useState<Business | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [sourceFilter, setSourceFilter] = useState<LeadSource | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail modal
  const [selectedLead, setSelectedLead] = useState<LeadWithNotes | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [sendingNote, setSendingNote] = useState(false);

  // New lead form
  const [showNewLeadForm, setShowNewLeadForm] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'manual' as LeadSource,
    notes: '',
  });
  const [creatingLead, setCreatingLead] = useState(false);

  // ── Auth & data loading ────────────────────────────────────
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
        .eq('is_active', true)
        .maybeSingle();

      if (!bizData) {
        setLoading(false);
        return;
      }

      setBusiness(bizData as Business);
      setLoading(false);
    }

    load();
  }, [user, authLoading, router]);

  // ── Load leads ─────────────────────────────────────────────
  const loadLeads = useCallback(async () => {
    if (!business) return;
    try {
      const filters: { status?: LeadStatus; source?: LeadSource } = {};
      if (sourceFilter) filters.source = sourceFilter as LeadSource;
      const result = await getLeadsByBusiness(business.id, filters);
      setLeads(result || []);
    } catch {
      toast.error('Erro ao carregar leads.');
    }
  }, [business, sourceFilter]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // ── Filtered leads by search ───────────────────────────────
  const filteredLeads = leads.filter(lead => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      lead.name.toLowerCase().includes(q) ||
      lead.phone.toLowerCase().includes(q) ||
      (lead.email && lead.email.toLowerCase().includes(q))
    );
  });

  // ── Leads grouped by status ────────────────────────────────
  const leadsByStatus: Record<LeadStatus, Lead[]> = STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = filteredLeads.filter(l => l.status === status);
      return acc;
    },
    {} as Record<LeadStatus, Lead[]>,
  );

  // ── Move lead to next/prev column ──────────────────────────
  const moveLead = async (leadId: string, direction: 'forward' | 'backward') => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const currentIdx = STATUS_ORDER.indexOf(lead.status);
    const newIdx = direction === 'forward' ? currentIdx + 1 : currentIdx - 1;

    if (newIdx < 0 || newIdx >= STATUS_ORDER.length) return;

    const newStatus = STATUS_ORDER[newIdx];

    try {
      await updateLeadStatus(leadId, newStatus);
      setLeads(prev =>
        prev.map(l => (l.id === leadId ? { ...l, status: newStatus } : l)),
      );
      toast.success(`Lead movido para "${LEAD_STATUS_LABELS[newStatus]}"`);
    } catch {
      toast.error('Erro ao mover lead.');
    }
  };

  // ── Open lead detail modal ─────────────────────────────────
  const openLeadDetail = async (lead: Lead) => {
    setModalLoading(true);
    setSelectedLead(null);
    try {
      const detail = await getLeadWithNotes(lead.id);
      setSelectedLead(detail);
    } catch {
      // Fallback: show lead without notes/history
      setSelectedLead({ lead, notes: [], history: [] });
    }
    setModalLoading(false);
  };

  // ── Add note to lead ───────────────────────────────────────
  const handleAddNote = async () => {
    if (!selectedLead || !newNote.trim()) return;
    setSendingNote(true);
    try {
      const note = await addLeadNote(selectedLead.lead.id, newNote.trim());
      setSelectedLead(prev =>
        prev
          ? { ...prev, notes: [...prev.notes, note] }
          : prev,
      );
      setNewNote('');
      toast.success('Nota adicionada!');
    } catch {
      toast.error('Erro ao adicionar nota.');
    }
    setSendingNote(false);
  };

  // ── Create new lead ────────────────────────────────────────
  const handleCreateLead = async () => {
    if (!business) return;
    if (!newLeadForm.name.trim() || !newLeadForm.phone.trim()) {
      toast.error('Nome e telefone são obrigatórios.');
      return;
    }

    setCreatingLead(true);
    try {
      const lead = await createLead({
        business_id: business.id,
        name: newLeadForm.name.trim(),
        phone: newLeadForm.phone.trim(),
        email: newLeadForm.email.trim() || undefined,
        source: newLeadForm.source,
        notes: newLeadForm.notes.trim() || undefined,
      });

      setLeads(prev => [lead, ...prev]);
      setShowNewLeadForm(false);
      setNewLeadForm({ name: '', phone: '', email: '', source: 'manual', notes: '' });
      toast.success('Lead criado com sucesso!');
    } catch {
      toast.error('Erro ao criar lead.');
    }
    setCreatingLead(false);
  };

  // ── Stats ──────────────────────────────────────────────────
  const totalLeads = leads.length;
  const conversionRate = leads.length > 0
    ? Math.round((leadsByStatus.vendido.length / leads.length) * 100)
    : 0;

  // ── Loading state ──────────────────────────────────────────
  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // ── No business state ──────────────────────────────────────
  if (!business) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Nenhum negócio encontrado</h1>
          <p className="text-gray-500 mb-6">Crie seu negócio no Dezzapego para acessar o pipeline de leads.</p>
          <Link
            href="/business/nova"
            className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700"
          >
            Criar Negócio
          </Link>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50">
      <SEO title={`Pipeline de Leads — ${business.name}`} description="Gerencie seus leads com pipeline Kanban" noIndex />
      <Header />

      <div className="max-w-[1600px] mx-auto px-4 py-6">
        {/* ── Page header ──────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/business/dashboard"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-violet-600 bg-clip-text text-transparent">
                Pipeline de Leads
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {totalLeads} lead{totalLeads !== 1 ? 's' : ''} · {conversionRate}% conversão
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowNewLeadForm(!showNewLeadForm)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl font-semibold text-sm shadow-md shadow-purple-200 hover:shadow-lg hover:shadow-purple-300 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Novo Lead
          </button>
        </div>

        {/* ── New lead inline form ─────────────────────────── */}
        {showNewLeadForm && (
          <div className="mb-6 bg-white rounded-2xl border border-purple-100 shadow-lg shadow-purple-100/50 p-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-600" />
                Novo Lead
              </h3>
              <button
                onClick={() => setShowNewLeadForm(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newLeadForm.name}
                  onChange={e => setNewLeadForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do lead"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Telefone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={newLeadForm.phone}
                  onChange={e => setNewLeadForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
                <input
                  type="email"
                  value={newLeadForm.email}
                  onChange={e => setNewLeadForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Origem</label>
                <select
                  value={newLeadForm.source}
                  onChange={e => setNewLeadForm(prev => ({ ...prev, source: e.target.value as LeadSource }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors appearance-none"
                >
                  {Object.entries(LEAD_SOURCE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
              <textarea
                value={newLeadForm.notes}
                onChange={e => setNewLeadForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observações iniciais sobre o lead..."
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors resize-none"
              />
            </div>

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleCreateLead}
                disabled={creatingLead}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingLead ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Criar Lead
              </button>
              <button
                onClick={() => setShowNewLeadForm(false)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ── Filters ──────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar leads por nome, telefone..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
            />
          </div>

          {/* Source filter */}
          <div className="relative">
            <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value as LeadSource | '')}
              className="appearance-none bg-white border border-gray-200 rounded-xl pl-9 pr-8 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors cursor-pointer"
            >
              <option value="">Todas as origens</option>
              {Object.entries(LEAD_SOURCE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            KANBAN BOARD
            ════════════════════════════════════════════════════ */}
        <div className="overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0">
          <div className="flex gap-4 min-w-max lg:min-w-0 lg:grid lg:grid-cols-7">
            {PIPELINE_COLUMNS.map(col => {
              const columnLeads = leadsByStatus[col.id] || [];
              return (
                <div
                  key={col.id}
                  className={`flex flex-col min-w-[260px] lg:min-w-0 ${col.bgColor} rounded-2xl border ${col.borderColor} overflow-hidden`}
                >
                  {/* Column header */}
                  <div className="px-4 py-3 border-b border-gray-200/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                        <h3 className={`text-sm font-bold ${col.color}`}>
                          {col.label}
                        </h3>
                      </div>
                      <span className="text-xs font-semibold text-gray-500 bg-white/80 px-2 py-0.5 rounded-full">
                        {columnLeads.length}
                      </span>
                    </div>
                  </div>

                  {/* Column body */}
                  <div className="flex-1 p-3 space-y-2.5 overflow-y-auto max-h-[calc(100vh-340px)]">
                    {columnLeads.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-xs">
                        Nenhum lead
                      </div>
                    ) : (
                      columnLeads.map(lead => {
                        const statusIdx = STATUS_ORDER.indexOf(lead.status);
                        const canGoBack = statusIdx > 0;
                        const canGoForward = statusIdx < STATUS_ORDER.length - 1;

                        return (
                          <div
                            key={lead.id}
                            className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                            onClick={() => openLeadDetail(lead)}
                          >
                            <div className="p-3.5">
                              {/* Lead name & move buttons */}
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-bold text-white">
                                      {lead.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate">
                                      {lead.name}
                                    </p>
                                  </div>
                                </div>

                                {/* Move buttons */}
                                <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {canGoBack && (
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        moveLead(lead.id, 'backward');
                                      }}
                                      className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                      title={`Mover para ${LEAD_STATUS_LABELS[STATUS_ORDER[statusIdx - 1]]}`}
                                    >
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {canGoForward && (
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        moveLead(lead.id, 'forward');
                                      }}
                                      className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                      title={`Mover para ${LEAD_STATUS_LABELS[STATUS_ORDER[statusIdx + 1]]}`}
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Phone */}
                              {lead.phone && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                                  <Phone className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{lead.phone}</span>
                                </div>
                              )}

                              {/* Source badge + date */}
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    SOURCE_COLORS[lead.source] || SOURCE_COLORS.outro
                                  }`}
                                >
                                  {LEAD_SOURCE_LABELS[lead.source] || lead.source}
                                </span>
                                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                  {new Date(lead.created_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'short',
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          DETAIL MODAL
          ═══════════════════════════════════════════════════════ */}
      {(selectedLead || modalLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => {
            if (!modalLoading) setSelectedLead(null);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {modalLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : selectedLead && (
              <>
                {/* Modal header */}
                <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-violet-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                        <span className="text-lg font-bold text-white">
                          {selectedLead.lead.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">
                          {selectedLead.lead.name}
                        </h2>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            SOURCE_COLORS[selectedLead.lead.source] || SOURCE_COLORS.outro
                          }`}
                        >
                          {LEAD_SOURCE_LABELS[selectedLead.lead.source]}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedLead(null)}
                      className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Modal body - scrollable */}
                <div className="overflow-y-auto max-h-[calc(90vh-280px)]">
                  {/* Contact info */}
                  <div className="px-6 py-4 border-b border-gray-50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedLead.lead.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4 text-purple-500" />
                          <a href={`tel:${selectedLead.lead.phone}`} className="hover:text-purple-600 transition-colors">
                            {selectedLead.lead.phone}
                          </a>
                          <a
                            href={`https://wa.me/55${selectedLead.lead.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto p-1.5 rounded-lg hover:bg-green-50 text-green-600"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </div>
                      )}
                      {selectedLead.lead.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4 text-purple-500" />
                          <a href={`mailto:${selectedLead.lead.email}`} className="hover:text-purple-600 transition-colors truncate">
                            {selectedLead.lead.email}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-purple-500" />
                        Criado em {new Date(selectedLead.lead.created_at).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="w-4 h-4 text-purple-500" />
                        Status: <span className="font-semibold">{LEAD_STATUS_LABELS[selectedLead.lead.status]}</span>
                      </div>
                    </div>

                    {selectedLead.lead.value && (
                      <div className="mt-3 text-sm text-gray-600">
                        <span className="font-medium">Valor: </span>
                        <span className="font-bold text-green-600">
                          R$ {selectedLead.lead.value.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    )}

                    {selectedLead.lead.notes && (
                      <div className="mt-3 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                        {selectedLead.lead.notes}
                      </div>
                    )}
                  </div>

                  {/* Notes section */}
                  <div className="px-6 py-4">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-500" />
                      Notas ({selectedLead.notes.length})
                    </h4>

                    {selectedLead.notes.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">Nenhuma nota registrada.</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedLead.notes.map(note => (
                          <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm text-gray-700">{note.text}</p>
                            <p className="text-[10px] text-gray-400 mt-1.5">
                              {new Date(note.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add note */}
                    <div className="mt-4 flex gap-2">
                      <input
                        type="text"
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddNote();
                          }
                        }}
                        placeholder="Adicionar uma nota..."
                        className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={!newNote.trim() || sendingNote}
                        className="p-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingNote ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* History section */}
                  {selectedLead.history.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-50">
                      <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <History className="w-4 h-4 text-purple-500" />
                        Histórico de Status
                      </h4>
                      <div className="space-y-2">
                        {selectedLead.history.map(h => (
                          <div key={h.id} className="flex items-center gap-3 text-xs">
                            <div className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                            <span className="text-gray-500">
                              {new Date(h.created_at).toLocaleString('pt-BR')}
                            </span>
                            <span className="text-gray-700">
                              {h.old_status ? LEAD_STATUS_LABELS[h.old_status] : '—'}
                              {' → '}
                              <span className="font-semibold">{LEAD_STATUS_LABELS[h.new_status]}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedLead(null)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Fechar
                  </button>
                  {selectedLead.lead.phone && (
                    <a
                      href={`https://wa.me/55${selectedLead.lead.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
