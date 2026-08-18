'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, Eye, EyeOff, Image, X, Check, FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  listBusinessCollections,
  createBusinessCollection,
  updateBusinessCollection,
  deleteBusinessCollection,
} from '@/lib/crm';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { BusinessCollection } from '@/types';

type Props = {
  businessId?: string;
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  image_url: '',
};

export default function CollectionManagement({ businessId: propBusinessId }: Props) {
  const { user, loading: authLoading } = useAuth();
  const [businessId, setBusinessId] = useState<string>(propBusinessId || '');
  const [collections, setCollections] = useState<BusinessCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [autoSlug, setAutoSlug] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listingCounts, setListingCounts] = useState<Record<string, number>>({});

  // Load business ID from auth if not provided as prop
  useEffect(() => {
    if (propBusinessId || authLoading || !user) return;
    async function loadBiz() {
      const { data } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user!.id)
        .single();
      if (data) setBusinessId(data.id);
      else setLoading(false);
    }
    loadBiz();
  }, [propBusinessId, authLoading, user]);

  const loadCollections = useCallback(async () => {
    try {
      const data = await listBusinessCollections(businessId);
      setCollections(data);

      // Load listing counts for each collection
      const counts: Record<string, number> = {};
      for (const col of data) {
        const { count } = await supabase
          .from('business_collection_listings')
          .select('*', { count: 'exact', head: true })
          .eq('collection_id', col.id);
        counts[col.id] = count ?? 0;
      }
      setListingCounts(counts);
    } catch {
      toast.error('Erro ao carregar coleções');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  function handleNameChange(value: string) {
    setForm(prev => ({
      ...prev,
      name: value,
      slug: autoSlug ? generateSlug(value) : prev.slug,
    }));
  }

  function handleSlugChange(value: string) {
    setAutoSlug(false);
    setForm(prev => ({ ...prev, slug: generateSlug(value) }));
  }

  function openNewForm() {
    setEditingId(null);
    setForm(emptyForm);
    setAutoSlug(true);
    setShowForm(true);
  }

  function openEditForm(col: BusinessCollection) {
    setEditingId(col.id);
    setForm({
      name: col.name,
      slug: col.slug,
      description: col.description ?? '',
      image_url: col.image_url ?? '',
    });
    setAutoSlug(false);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setAutoSlug(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!form.slug.trim()) {
      toast.error('Slug é obrigatório');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateBusinessCollection(editingId, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          image_url: form.image_url.trim() || undefined,
        });
        toast.success('Coleção atualizada!');
      } else {
        await createBusinessCollection({
          business_id: businessId,
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim() || undefined,
          image_url: form.image_url.trim() || undefined,
        });
        toast.success('Coleção criada!');
      }
      closeForm();
      await loadCollections();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar coleção');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(col: BusinessCollection) {
    setDeletingId(col.id);
  }

  async function confirmDelete(colId: string) {
    try {
      await deleteBusinessCollection(colId);
      toast.success('Coleção excluída!');
      setDeletingId(null);
      await loadCollections();
    } catch {
      toast.error('Erro ao excluir coleção');
    }
  }

  async function toggleActive(col: BusinessCollection) {
    try {
      await updateBusinessCollection(col.id, { is_active: !col.is_active });
      toast.success(col.is_active ? 'Coleção desativada' : 'Coleção ativada');
      await loadCollections();
    } catch {
      toast.error('Erro ao alterar status');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Coleções</h2>
            <p className="text-sm text-gray-500">
              Organize seus anúncios em grupos temáticos
            </p>
          </div>
        </div>
        <button
          onClick={openNewForm}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Coleção
        </button>
      </div>

      {/* Inline Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border-2 border-purple-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">
              {editingId ? 'Editar Coleção' : 'Nova Coleção'}
            </h3>
            <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="Ex: Imóveis de luxo"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug *
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={e => handleSlugChange(e.target.value)}
                placeholder="imoveis-de-luxo"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">Gerado automaticamente do nome</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva brevemente esta coleção..."
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL da Imagem
              </label>
              <input
                type="url"
                value={form.image_url}
                onChange={e => setForm(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://exemplo.com/imagem.jpg"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-5">
            <button
              onClick={closeForm}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {editingId ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      )}

      {/* Collections Grid */}
      {collections.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma coleção criada</p>
          <p className="text-sm text-gray-400 mt-1">
            Crie coleções para organizar seus anúncios na vitrine
          </p>
          <button
            onClick={openNewForm}
            className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 mx-auto transition-colors"
          >
            <Plus className="w-4 h-4" />
            Criar Primeira Coleção
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map(col => (
            <div
              key={col.id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Image */}
              <div className="h-40 bg-purple-50 relative overflow-hidden">
                {col.image_url ? (
                  <img
                    src={col.image_url}
                    alt={col.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-10 h-10 text-purple-200" />
                  </div>
                )}
                {/* Badge */}
                <span
                  className={`absolute top-3 right-3 px-2.5 py-1 text-xs font-semibold rounded-full ${
                    col.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {col.is_active ? 'Ativa' : 'Inativa'}
                </span>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-gray-900 truncate">{col.name}</h3>
                <p className="text-xs text-purple-500 font-mono mt-0.5">/{col.slug}</p>
                {col.description && (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">{col.description}</p>
                )}
                <div className="flex items-center gap-1.5 mt-3">
                  <span className="text-xs text-gray-400">
                    {listingCounts[col.id] ?? 0} anúncio{(listingCounts[col.id] ?? 0) !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => toggleActive(col)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      col.is_active
                        ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                        : 'text-green-600 bg-green-50 hover:bg-green-100'
                    }`}
                  >
                    {col.is_active ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        Desativar
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        Ativar
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => openEditForm(col)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  {deletingId === col.id ? (
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => confirmDelete(col.id)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDelete(col)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
