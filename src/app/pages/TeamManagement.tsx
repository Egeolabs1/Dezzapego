'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Users, UserPlus, Trash2, ChevronDown, Shield, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  getBusinessMembers,
  inviteBusinessMember,
  updateBusinessMemberRole,
  removeBusinessMember,
} from '@/lib/crm';
import { MEMBER_ROLE_LABELS, type BusinessMemberRole } from '@/types';

type MemberRow = {
  id: string;
  user_id: string;
  role: BusinessMemberRole;
  status: string;
  profiles: { display_name: string | null; avatar_url: string | null } | null;
} & Record<string, unknown>;

const ROLE_COLORS: Record<BusinessMemberRole, string> = {
  owner: 'bg-purple-100 text-purple-700 border-purple-200',
  admin: 'bg-blue-100 text-blue-700 border-blue-200',
  manager: 'bg-green-100 text-green-700 border-green-200',
  sales: 'bg-orange-100 text-orange-700 border-orange-200',
  agent: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  viewer: 'bg-gray-100 text-gray-600 border-gray-200',
};

const ALL_ROLES: BusinessMemberRole[] = ['admin', 'manager', 'sales', 'agent', 'viewer'];

function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export default function TeamManagement({ businessId: propBusinessId }: { businessId?: string }) {
  const { user, loading: authLoading } = useAuth();
  const [businessId, setBusinessId] = useState<string>(propBusinessId || '');
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<BusinessMemberRole>('agent');
  const [inviting, setInviting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

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

  const loadMembers = useCallback(async () => {
    try {
      const data = await getBusinessMembers(businessId);
      setMembers(data as MemberRow[]);
    } catch {
      toast.error('Erro ao carregar membros da equipe.');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) {
      toast.error('Informe o e-mail do membro.');
      return;
    }
    setInviting(true);
    try {
      await inviteBusinessMember(businessId, email, inviteRole);
      toast.success(`Convite enviado para ${email}`);
      setInviteEmail('');
      setInviteRole('agent');
      setShowInvite(false);
      await loadMembers();
    } catch {
      toast.error('Erro ao enviar convite. Verifique o e-mail e tente novamente.');
    } finally {
      setInviting(false);
    }
  }

  async function handleChangeRole(userId: string, newRole: BusinessMemberRole) {
    try {
      await updateBusinessMemberRole(businessId, userId, newRole);
      toast.success('Função atualizada com sucesso.');
      await loadMembers();
    } catch {
      toast.error('Erro ao atualizar função do membro.');
    }
  }

  async function handleRemove(userId: string) {
    setRemovingId(userId);
    try {
      await removeBusinessMember(businessId, userId);
      toast.success('Membro removido da equipe.');
      setConfirmRemove(null);
      await loadMembers();
    } catch {
      toast.error('Erro ao remover membro.');
    } finally {
      setRemovingId(null);
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
          <div className="p-2 bg-purple-100 rounded-xl">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Equipe</h2>
            <p className="text-sm text-gray-500">
              {members.length} membro{members.length !== 1 ? 's' : ''} na equipe
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-medium text-sm hover:bg-purple-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Convidar Membro
        </button>
      </div>

      {/* Invite Form */}
      {showInvite && (
        <form
          onSubmit={handleInvite}
          className="bg-white border border-purple-200 rounded-2xl p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Novo Membro</h3>
            <button
              type="button"
              onClick={() => setShowInvite(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Função
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as BusinessMemberRole)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              >
                {ALL_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {MEMBER_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={inviting}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-medium text-sm hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {inviting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Enviar Convite
            </button>
          </div>
        </form>
      )}

      {/* Members List */}
      {members.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum membro encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => {
            const name = member.profiles?.display_name || 'Sem nome';
            const avatar = member.profiles?.avatar_url;
            const isOwner = member.role === 'owner';
            const isRemoving = removingId === member.user_id;

            return (
              <div
                key={member.id}
                className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-purple-200 transition-colors"
              >
                {/* Avatar + Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={name}
                      className="w-11 h-11 rounded-full object-cover flex-shrink-0 ring-2 ring-purple-100"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {getInitials(name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{name}</p>
                    <span
                      className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full border mt-0.5 ${ROLE_COLORS[member.role]}`}
                    >
                      <Shield className="w-3 h-3 inline -mt-0.5 mr-1" />
                      {MEMBER_ROLE_LABELS[member.role]}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {!isOwner && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Role Change */}
                    <div className="relative">
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleChangeRole(member.user_id, e.target.value as BusinessMemberRole)
                        }
                        className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {ALL_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {MEMBER_ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Remove */}
                    {confirmRemove === member.user_id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-red-600 font-medium">Remover?</span>
                        <button
                          onClick={() => handleRemove(member.user_id)}
                          disabled={isRemoving}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          {isRemoving ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            'Sim'
                          )}
                        </button>
                        <button
                          onClick={() => setConfirmRemove(null)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemove(member.user_id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Remover membro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
