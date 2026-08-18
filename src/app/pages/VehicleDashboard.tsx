'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, ExternalLink, Car, Calendar, ArrowLeftRight,
  Phone, MessageCircle, Pencil, Plus, Trash2, Check, X,
  ChevronDown, Settings, Package, Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../../components/SEO';
import { BUSINESS_TYPE_LABELS } from '../../lib/businesses';
import {
  getVehicleDealerByBusinessId,
  upsertVehicleDealer,
  listVehiclesByBusiness,
  updateVehicleListing,
  listTestDrivesByBusiness,
  updateTestDriveStatus,
  listTradeInsByBusiness,
  listCollectionsByBusiness,
} from '../../lib/vehicleDealer';
import type {
  Business,
  VehicleListing,
  TestDrive,
  TradeIn,
  VehicleCollection,
} from '../../types';

type DashboardTab = 'overview' | 'vehicles' | 'test-drives' | 'trade-ins' | 'collections' | 'settings';

const VEHICLE_STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  sold: 'Vendido',
  reserved: 'Reservado',
  paused: 'Pausado',
};

const VEHICLE_STATUS_COLORS: Record<string, string> = {
  active: 'text-green-700 bg-green-50',
  sold: 'text-blue-700 bg-blue-50',
  reserved: 'text-orange-700 bg-orange-50',
  paused: 'text-gray-700 bg-gray-100',
};

const TEST_DRIVE_STATUS_COLORS: Record<string, string> = {
  solicitado: 'text-orange-700 bg-orange-50',
  confirmado: 'text-green-700 bg-green-50',
  reagendado: 'text-blue-700 bg-blue-50',
  cancelado: 'text-red-700 bg-red-50',
  concluido: 'text-purple-700 bg-purple-50',
};

const TRADE_IN_STATUS_COLORS: Record<string, string> = {
  pending: 'text-orange-700 bg-orange-50',
  contacted: 'text-blue-700 bg-blue-50',
  negotiating: 'text-purple-700 bg-purple-50',
  accepted: 'text-green-700 bg-green-50',
  rejected: 'text-red-700 bg-red-50',
};

export default function VehicleDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Data
  const [vehicles, setVehicles] = useState<VehicleListing[]>([]);
  const [vehiclesTotal, setVehiclesTotal] = useState(0);
  const [testDrives, setTestDrives] = useState<TestDrive[]>([]);
  const [tradeIns, setTradeIns] = useState<TradeIn[]>([]);
  const [collections, setCollections] = useState<VehicleCollection[]>([]);

  // Filters
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<string>('');

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    cnpj: '',
    brands_worked: [] as string[],
    has_financing: false,
    accepts_trade: true,
    has_delivery: false,
    delivery_reach: 'LOCAL' as string,
    business_hours: '',
    whatsapp_message: '',
  });

  const [brandInput, setBrandInput] = useState('');

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
        .eq('type', 'vehicle_dealer')
        .eq('is_active', true)
        .maybeSingle();

      if (!bizData) {
        setLoading(false);
        return;
      }

      const b = bizData as Business;
      setBusiness(b);

      // Load all data in parallel
      const [dvData, vehResult, tdData, tiData, colData] = await Promise.all([
        getVehicleDealerByBusinessId(b.id),
        listVehiclesByBusiness(b.id, {}),
        listTestDrivesByBusiness(b.id),
        listTradeInsByBusiness(b.id),
        listCollectionsByBusiness(b.id),
      ]);

      setVehicles(vehResult.data);
      setVehiclesTotal(vehResult.count);
      setTestDrives(tdData);
      setTradeIns(tiData);
      setCollections(colData);

      // Populate settings form
      if (dvData) {
        setSettingsForm({
          cnpj: dvData.cnpj || '',
          brands_worked: dvData.brands_worked || [],
          has_financing: dvData.has_financing ?? false,
          accepts_trade: dvData.accepts_trade ?? true,
          has_delivery: dvData.has_delivery ?? false,
          delivery_reach: dvData.delivery_reach || 'LOCAL',
          business_hours: dvData.business_hours || '',
          whatsapp_message: '',
        });
      }

      setLoading(false);
    }

    load();
  }, [user, authLoading, router]);

  // ── Reload vehicles ─────────────────────────────────────────────
  const reloadVehicles = useCallback(async () => {
    if (!business) return;
    const result = await listVehiclesByBusiness(business.id, {
      status: vehicleStatusFilter || undefined,
    });
    setVehicles(result.data);
    setVehiclesTotal(result.count);
  }, [business, vehicleStatusFilter]);

  useEffect(() => {
    reloadVehicles();
  }, [vehicleStatusFilter, reloadVehicles]);

  // ── Handlers ────────────────────────────────────────────────────
  const handleVehicleStatusChange = async (vehicleId: string, newStatus: string) => {
    try {
      await updateVehicleListing(vehicleId, { status: newStatus });
      setVehicles(prev =>
        prev.map(v => (v.id === vehicleId ? { ...v, status: newStatus as any } : v)),
      );
      toast.success('Status do veículo atualizado!');
    } catch {
      toast.error('Erro ao atualizar status.');
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm('Tem certeza que deseja remover este veículo?')) return;
    try {
      await updateVehicleListing(vehicleId, { status: 'paused' });
      setVehicles(prev => prev.filter(v => v.id !== vehicleId));
      toast.success('Veículo removido.');
    } catch {
      toast.error('Erro ao remover veículo.');
    }
  };

  const handleTestDriveStatusChange = async (driveId: string, newStatus: string) => {
    try {
      await updateTestDriveStatus(driveId, newStatus);
      setTestDrives(prev =>
        prev.map(td => (td.id === driveId ? { ...td, status: newStatus as any } : td)),
      );
      toast.success('Status do test drive atualizado!');
    } catch {
      toast.error('Erro ao atualizar status.');
    }
  };

  // ── Settings save ───────────────────────────────────────────────
  const handleSaveSettings = async () => {
    if (!business) return;
    try {
      await upsertVehicleDealer(business.id, {
        cnpj: settingsForm.cnpj.trim() || null,
        brands_worked: settingsForm.brands_worked,
        has_financing: settingsForm.has_financing,
        accepts_trade: settingsForm.accepts_trade,
        has_delivery: settingsForm.has_delivery,
        delivery_reach: settingsForm.delivery_reach as any,
        business_hours: settingsForm.business_hours.trim() || null,
      });
      toast.success('Configurações salvas!');
    } catch {
      toast.error('Erro ao salvar configurações.');
    }
  };

  const addBrand = () => {
    const val = brandInput.trim();
    if (val && !settingsForm.brands_worked.includes(val)) {
      setSettingsForm(prev => ({ ...prev, brands_worked: [...prev.brands_worked, val] }));
      setBrandInput('');
    }
  };

  const removeBrand = (brand: string) => {
    setSettingsForm(prev => ({
      ...prev,
      brands_worked: prev.brands_worked.filter(b => b !== brand),
    }));
  };

  // ── Loading ─────────────────────────────────────────────────────
  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // ── No business ─────────────────────────────────────────────────
  if (!business) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Você ainda não tem uma concessionária</h1>
          <p className="text-gray-500 mb-6">Crie sua página profissional no Dezzapego.</p>
          <Link
            href="/business/nova"
            className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700"
          >
            Criar Concessionária
          </Link>
        </div>
      </div>
    );
  }

  // ── Tabs ────────────────────────────────────────────────────────
  const tabs: { id: DashboardTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Visão Geral', icon: Package },
    { id: 'vehicles', label: 'Veículos', icon: Car },
    { id: 'test-drives', label: 'Test Drives', icon: Calendar },
    { id: 'trade-ins', label: 'Trocas', icon: ArrowLeftRight },
    { id: 'collections', label: 'Coleções', icon: Tag },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  const activeVehicles = vehicles.filter(v => v.status === 'active').length;
  const soldVehicles = vehicles.filter(v => v.status === 'sold').length;
  const pendingTestDrives = testDrives.filter(td => td.status === 'solicitado').length;
  const pendingTradeIns = tradeIns.filter(ti => ti.status === 'pending').length;

  const statCards = [
    { label: 'Total Veículos', value: vehiclesTotal, icon: Car, color: 'text-purple-600 bg-purple-50' },
    { label: 'Ativos', value: activeVehicles, icon: Package, color: 'text-green-600 bg-green-50' },
    { label: 'Vendidos', value: soldVehicles, icon: Tag, color: 'text-blue-600 bg-blue-50' },
    { label: 'Test Drives', value: pendingTestDrives, icon: Calendar, color: 'text-orange-600 bg-orange-50' },
    { label: 'Trocas Pendentes', value: pendingTradeIns, icon: ArrowLeftRight, color: 'text-red-600 bg-red-50' },
  ];

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="bg-gray-50 min-h-screen">
      <SEO title={`Dashboard Concessionária — ${business.name}`} description="Painel de gerenciamento de veículos" noIndex />
      <Header />

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center overflow-hidden">
              {business.logo_url ? (
                <img src={business.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-purple-600">{business.name.charAt(0)}</span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{business.name}</h1>
              <p className="text-sm text-gray-500">{BUSINESS_TYPE_LABELS[business.type] || 'Concessionária'}</p>
            </div>
          </div>
          <Link
            href={`/empresa/${business.slug}`}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            <ExternalLink className="w-4 h-4" /> Ver Página Pública
          </Link>
        </div>

        {/* ── Stats ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
              className={`flex items-center gap-1.5 flex-1 min-w-[100px] py-2.5 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
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
                <p className="text-sm text-gray-500">Total Veículos</p>
                <p className="text-xl font-bold text-gray-900">{vehiclesTotal}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-sm text-gray-500">Ativos</p>
                <p className="text-xl font-bold text-green-600">{activeVehicles}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-sm text-gray-500">Vendidos</p>
                <p className="text-xl font-bold text-blue-600">{soldVehicles}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-sm text-gray-500">Test Drives Pendentes</p>
                <p className="text-xl font-bold text-orange-600">{pendingTestDrives}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h2 className="font-bold text-gray-900 mb-3">Ações Rápidas</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Link
                  href="/anunciar"
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-purple-50 hover:border-purple-200 transition-colors"
                >
                  <Plus className="w-6 h-6 text-purple-600" />
                  <span className="text-xs font-medium text-gray-700">Adicionar Veículo</span>
                </Link>
                <button
                  onClick={() => setActiveTab('collections')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-purple-50 hover:border-purple-200 transition-colors"
                >
                  <Tag className="w-6 h-6 text-purple-600" />
                  <span className="text-xs font-medium text-gray-700">Gerenciar Coleções</span>
                </button>
                <button
                  onClick={() => setActiveTab('test-drives')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-purple-50 hover:border-purple-200 transition-colors"
                >
                  <Calendar className="w-6 h-6 text-purple-600" />
                  <span className="text-xs font-medium text-gray-700">Test Drives</span>
                </button>
                <button
                  onClick={() => setActiveTab('trade-ins')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-purple-50 hover:border-purple-200 transition-colors"
                >
                  <ArrowLeftRight className="w-6 h-6 text-purple-600" />
                  <span className="text-xs font-medium text-gray-700">Solicitações de Troca</span>
                </button>
              </div>
            </div>

            {/* Recent Vehicles */}
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900">Veículos Recentes</h2>
                <button
                  onClick={() => setActiveTab('vehicles')}
                  className="text-sm text-purple-600 hover:underline"
                >
                  Ver todos
                </button>
              </div>
              {vehicles.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">Nenhum veículo cadastrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 text-gray-500 font-medium">Veículo</th>
                        <th className="text-left py-2 text-gray-500 font-medium">Ano</th>
                        <th className="text-left py-2 text-gray-500 font-medium">Preço</th>
                        <th className="text-left py-2 text-gray-500 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.slice(0, 5).map(vehicle => (
                        <tr key={vehicle.id} className="border-b border-gray-50">
                          <td className="py-2.5 text-gray-900 font-medium">
                            {vehicle.brand} {vehicle.model}
                          </td>
                          <td className="py-2.5 text-gray-600">{vehicle.year_model}</td>
                          <td className="py-2.5 text-gray-600">
                            R$ {vehicle.price.toLocaleString('pt-BR')}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                VEHICLE_STATUS_COLORS[vehicle.status] || 'text-gray-700 bg-gray-100'
                              }`}
                            >
                              {VEHICLE_STATUS_LABELS[vehicle.status] || vehicle.status}
                            </span>
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

        {/* ─── Veículos ────────────────────────────────────── */}
        {activeTab === 'vehicles' && (
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="font-bold text-gray-900">Veículos ({vehiclesTotal})</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select
                    value={vehicleStatusFilter}
                    onChange={e => setVehicleStatusFilter(e.target.value)}
                    className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Todos os status</option>
                    <option value="active">Ativo</option>
                    <option value="sold">Vendido</option>
                    <option value="reserved">Reservado</option>
                    <option value="paused">Pausado</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <Link
                  href="/anunciar"
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" /> Novo Veículo
                </Link>
              </div>
            </div>

            {vehicles.length === 0 ? (
              <div className="text-center py-12">
                <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum veículo cadastrado.</p>
                <Link href="/anunciar" className="text-sm text-purple-600 hover:underline mt-2 inline-block">
                  Cadastrar primeiro veículo
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {vehicles.map(vehicle => (
                  <div
                    key={vehicle.id}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-20 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                      {vehicle.images?.[0] ? (
                        <img src={vehicle.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Car className="w-6 h-6 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {vehicle.brand} {vehicle.model} {vehicle.version || ''}
                      </p>
                      <p className="text-xs text-gray-500">
                        {vehicle.year_fabrication}/{vehicle.year_model}
                        {vehicle.mileage ? ` · ${vehicle.mileage.toLocaleString('pt-BR')} km` : ''}
                        {vehicle.fuel ? ` · ${vehicle.fuel}` : ''}
                      </p>
                      <p className="text-sm font-bold text-purple-600">
                        R$ {vehicle.price.toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={vehicle.status}
                        onChange={e =>
                          handleVehicleStatusChange(vehicle.id, e.target.value)
                        }
                        className={`appearance-none text-[11px] font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${
                          VEHICLE_STATUS_COLORS[vehicle.status] || 'text-gray-700 bg-gray-100'
                        }`}
                      >
                        <option value="active">Ativo</option>
                        <option value="sold">Vendido</option>
                        <option value="reserved">Reservado</option>
                        <option value="paused">Pausado</option>
                      </select>
                      <button
                        onClick={() => handleDeleteVehicle(vehicle.id)}
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

        {/* ─── Test Drives ─────────────────────────────────── */}
        {activeTab === 'test-drives' && (
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Test Drives ({testDrives.length})</h2>
            </div>

            {testDrives.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum test drive agendado.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {testDrives.map(td => (
                  <div
                    key={td.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{td.buyer_name}</p>
                      <p className="text-xs text-gray-500">
                        {td.buyer_phone} · {td.requested_date} às {td.requested_time}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Veículo: {(td as any).vehicle_listings?.brand} {(td as any).vehicle_listings?.model} {(td as any).vehicle_listings?.year_model}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={td.status}
                        onChange={e =>
                          handleTestDriveStatusChange(td.id, e.target.value)
                        }
                        className={`appearance-none text-[11px] font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${
                          TEST_DRIVE_STATUS_COLORS[td.status] || 'text-gray-700 bg-gray-100'
                        }`}
                      >
                        <option value="solicitado">Solicitado</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="reagendado">Reagendado</option>
                        <option value="cancelado">Cancelado</option>
                        <option value="concluido">Concluído</option>
                      </select>
                      {td.buyer_phone && (
                        <a
                          href={`https://wa.me/55${td.buyer_phone.replace(/\D/g, '')}`}
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

        {/* ─── Trocas ──────────────────────────────────────── */}
        {activeTab === 'trade-ins' && (
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Solicitações de Troca ({tradeIns.length})</h2>
            </div>

            {tradeIns.length === 0 ? (
              <div className="text-center py-12">
                <ArrowLeftRight className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhuma solicitação de troca recebida.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tradeIns.map(ti => (
                  <div
                    key={ti.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                      <ArrowLeftRight className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {ti.brand} {ti.model} {ti.version || ''}
                      </p>
                      <p className="text-xs text-gray-500">
                        Ano: {ti.year}
                        {ti.mileage ? ` · ${ti.mileage.toLocaleString('pt-BR')} km` : ''}
                        {ti.expected_value ? ` · Valor esperado: R$ ${ti.expected_value.toLocaleString('pt-BR')}` : ''}
                      </p>
                      {ti.notes && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{ti.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={ti.status}
                        onChange={e => {
                          const newStatus = e.target.value;
                          setTradeIns(prev =>
                            prev.map(t => (t.id === ti.id ? { ...t, status: newStatus as any } : t)),
                          );
                          toast.success('Status da troca atualizado!');
                        }}
                        className={`appearance-none text-[11px] font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${
                          TRADE_IN_STATUS_COLORS[ti.status] || 'text-gray-700 bg-gray-100'
                        }`}
                      >
                        <option value="pending">Pendente</option>
                        <option value="contacted">Contatado</option>
                        <option value="negotiating">Negociando</option>
                        <option value="accepted">Aceito</option>
                        <option value="rejected">Rejeitado</option>
                      </select>
                      <button
                        className="p-1.5 rounded-lg hover:bg-green-50 text-green-600"
                        title="Entrar em contato"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Coleções ────────────────────────────────────── */}
        {activeTab === 'collections' && (
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Coleções ({collections.length})</h2>
              <button className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                <Plus className="w-4 h-4" /> Nova Coleção
              </button>
            </div>

            {collections.length === 0 ? (
              <div className="text-center py-12">
                <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhuma coleção criada.</p>
                <p className="text-xs text-gray-400 mt-1">Crie coleções para organizar seus veículos por tema ou categoria.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {collections.map(col => (
                  <div
                    key={col.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg bg-purple-50 overflow-hidden shrink-0">
                      {col.image_url ? (
                        <img src={col.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Tag className="w-5 h-5 text-purple-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{col.name}</p>
                      {col.description && (
                        <p className="text-xs text-gray-500 truncate">{col.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          col.is_active ? 'text-green-700 bg-green-50' : 'text-gray-600 bg-gray-100'
                        }`}
                      >
                        {col.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                      <button
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
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
              <Settings className="w-5 h-5 text-purple-600" /> Configurações da Concessionária
            </h2>

            {/* CNPJ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
              <input
                type="text"
                value={settingsForm.cnpj}
                onChange={e => setSettingsForm(prev => ({ ...prev, cnpj: e.target.value }))}
                placeholder="00.000.000/0000-00"
                className="w-full max-w-xs px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Brands Worked */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marcas Atendidas
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {settingsForm.brands_worked.map((brand, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-sm border border-purple-100"
                  >
                    {brand}
                    <button
                      onClick={() => removeBrand(brand)}
                      className="text-purple-400 hover:text-purple-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={brandInput}
                  onChange={e => setBrandInput(e.target.value)}
                  placeholder="Ex: Toyota, Honda, Fiat..."
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addBrand();
                    }
                  }}
                />
                <button
                  onClick={addBrand}
                  className="px-4 py-2.5 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200 text-gray-700"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Financing & Trade-in */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.has_financing}
                  onChange={e =>
                    setSettingsForm(prev => ({ ...prev, has_financing: e.target.checked }))
                  }
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Financiamento</p>
                  <p className="text-xs text-gray-500">Aceita financiamento</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.accepts_trade}
                  onChange={e =>
                    setSettingsForm(prev => ({ ...prev, accepts_trade: e.target.checked }))
                  }
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Troca</p>
                  <p className="text-xs text-gray-500">Aceita troca</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.has_delivery}
                  onChange={e =>
                    setSettingsForm(prev => ({ ...prev, has_delivery: e.target.checked }))
                  }
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Entrega</p>
                  <p className="text-xs text-gray-500">Oferece entrega</p>
                </div>
              </label>
            </div>

            {/* Delivery Reach */}
            {settingsForm.has_delivery && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Abrangência da Entrega
                </label>
                <select
                  value={settingsForm.delivery_reach}
                  onChange={e =>
                    setSettingsForm(prev => ({ ...prev, delivery_reach: e.target.value }))
                  }
                  className="w-full max-w-xs px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="LOCAL">Local</option>
                  <option value="REGIONAL">Regional</option>
                  <option value="ESTADUAL">Estadual</option>
                  <option value="NACIONAL">Nacional</option>
                </select>
              </div>
            )}

            {/* Business Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horário de Funcionamento
              </label>
              <textarea
                value={settingsForm.business_hours}
                onChange={e =>
                  setSettingsForm(prev => ({ ...prev, business_hours: e.target.value }))
                }
                placeholder="Ex: Seg-Sex 8h às 18h, Sáb 8h às 13h"
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            {/* Save */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveSettings}
                className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-700"
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
