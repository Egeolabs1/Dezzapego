'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../../components/SEO';
import { createBusiness, updateBusiness, getBusinessById } from '../../lib/businesses';
import { BUSINESS_TYPE_LABELS } from '../../lib/businesses';
import type { BusinessType } from '../../types';

const STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export default function BusinessForm() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [existingBusinessId, setExistingBusinessId] = useState<string | null>(null);
  const [existingSlug, setExistingSlug] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<BusinessType>('generic');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }

    // Check if user already has a business
    supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExistingBusinessId(data.id);
          getBusinessById(data.id).then(b => {
            if (b) {
              setExistingSlug(b.slug);
              setName(b.name);
              setType(b.type);
              setDescription(b.description || '');
              setPhone(b.phone || '');
              setWhatsapp(b.whatsapp || '');
              setEmail(b.email || '');
              setWebsite(b.website || '');
              setInstagram(b.instagram || '');
              setFacebook(b.facebook || '');
              setCnpj(b.cnpj || '');
              setAddress(b.address || '');
              setNeighborhood(b.neighborhood || '');
              setCity(b.city || '');
              setState(b.state || '');
            }
          });
        }
      });
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Informe o nome da empresa.'); return; }
    setLoading(true);
    try {
      if (existingBusinessId) {
        await updateBusiness(existingBusinessId, {
          name, type, description: description || null,
          phone: phone || null, whatsapp: whatsapp || null, email: email || null,
          website: website || null, instagram: instagram || null, facebook: facebook || null,
          cnpj: cnpj || null, address: address || null, neighborhood: neighborhood || null,
          city: city || null, state: state || null,
        });
        toast.success('Empresa atualizada!');
        router.push(`/empresa/${existingSlug}`);
      } else {
        const business = await createBusiness({
          name, type, description: description || undefined,
          phone: phone || undefined, whatsapp: whatsapp || undefined,
          email: email || undefined, city: city || undefined,
          state: state || undefined, neighborhood: neighborhood || undefined,
        });
        if (business) {
          toast.success('Empresa criada com sucesso!');
          router.push(`/empresa/${business.slug}`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar empresa.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <SEO title={existingBusinessId ? 'Editar Empresa' : 'Criar Empresa'} description="Gerencie sua empresa no Dezzapego" noIndex />
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 text-sm">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {existingBusinessId ? 'Editar Empresa' : 'Criar sua Empresa'}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {existingBusinessId ? 'Atualize as informações da sua empresa.' : 'Crie uma página profissional para sua empresa no Dezzapego.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                placeholder="Ex: AutoStar Veículos" />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Empresa</label>
              <select value={type} onChange={e => setType(e.target.value as BusinessType)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white">
                {Object.entries(BUSINESS_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm resize-none"
                placeholder="Conte um pouco sobre sua empresa..." />
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="(00) 0000-0000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="(00) 00000-0000" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                placeholder="contato@empresa.com" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                <input type="text" value={cnpj} onChange={e => setCnpj(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input type="url" value={website} onChange={e => setWebsite(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="https://..." />
              </div>
            </div>

            {/* Social */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="@usuario" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
                <input type="url" value={facebook} onChange={e => setFacebook(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="https://facebook.com/..." />
              </div>
            </div>

            {/* Location */}
            <hr className="border-gray-100" />
            <h3 className="font-semibold text-gray-900">Localização</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                placeholder="Rua, número, complemento" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                <input type="text" value={neighborhood} onChange={e => setNeighborhood(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <input type="text" value={city} onChange={e => setCity(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select value={state} onChange={e => setState(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white">
                <option value="">Selecione</option>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {existingBusinessId ? 'Salvar Alterações' : 'Criar Empresa'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
