import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Header } from '../components/Header';
import { ImageUpload } from '../components/ImageUpload';
import { Loader2, User, Save, Package, Shield, ExternalLink, ShieldCheck, AlertCircle, Download, Heart } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SEO from '../../components/SEO';
import { digitsOnly, formatCpfCnpj, formatPhone, isValidCpfOrCnpj } from '../../lib/marketplaceQuality';

export default function UserDashboard() {
    const { user, profile, refreshProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [savingAvatar, setSavingAvatar] = useState(false);
    const [submittingVerification, setSubmittingVerification] = useState(false);
    // Form State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [avatar, setAvatar] = useState<string[]>([]);
    const [bio, setBio] = useState('');
    const [state, setState] = useState('');
    const [city, setCity] = useState('');
    const [website, setWebsite] = useState('');
    const [instagram, setInstagram] = useState('');
    const [cpfCnpj, setCpfCnpj] = useState('');
    const [verifyDocUrls, setVerifyDocUrls] = useState<string[]>([]);
    const [verifySelfieUrls, setVerifySelfieUrls] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'profile' | 'verification' | 'settings'>('profile');
    // Use profile status or default
    const verificationStatus = profile?.verification_status || 'none';
    const verificationBadgeText = verificationStatus === 'pending' ? 'Em análise' : verificationStatus === 'rejected' ? 'Recusada' : null;

    // Stats State
    const [stats, setStats] = useState({ totalAds: 0, totalViews: 0 });
    const hydratedProfileRef = useRef<{ userId: string | null; usedProfileSnapshot: boolean }>({
        userId: null,
        usedProfileSnapshot: false,
    });

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            hydratedProfileRef.current = { userId: null, usedProfileSnapshot: false };
            router.push('/login');
            return;
        }

        const isNewUser = hydratedProfileRef.current.userId !== user.id;
        if (isNewUser) {
            hydratedProfileRef.current = { userId: user.id, usedProfileSnapshot: false };
        }

        // Hidrata formulário apenas na entrada da tela (ou 1x quando perfil chegar),
        // evitando sobrescrever edições não salvas após refreshProfile().
        const shouldHydrate =
            isNewUser || (!hydratedProfileRef.current.usedProfileSnapshot && Boolean(profile));

        if (!shouldHydrate) return;

        setName(profile?.full_name || user.user_metadata?.full_name || '');
        setPhone(formatPhone(profile?.phone || user.user_metadata?.phone || ''));
        setBio(profile?.bio || user.user_metadata?.bio || '');
        setState(profile?.state || user.user_metadata?.state || '');
        setCity(profile?.city || user.user_metadata?.city || '');
        setWebsite(profile?.website || user.user_metadata?.website || '');
        setInstagram(profile?.instagram || user.user_metadata?.instagram || '');
        setCpfCnpj(formatCpfCnpj(profile?.cpf_cnpj || user.user_metadata?.cpf_cnpj || ''));

        if (profile?.avatar_url) {
            setAvatar([profile.avatar_url]);
        } else if (user.user_metadata?.avatar_url) {
            setAvatar([user.user_metadata.avatar_url]);
        } else {
            setAvatar([]);
        }

        hydratedProfileRef.current.usedProfileSnapshot = Boolean(profile);
    }, [user, profile, router, authLoading]);

    useEffect(() => {
        const docs = profile?.verification_docs;
        if (!docs || typeof docs !== 'object') return;
        const d = docs as { doc?: unknown; selfie?: unknown };
        setVerifyDocUrls(Array.isArray(d.doc) ? (d.doc as string[]) : []);
        setVerifySelfieUrls(Array.isArray(d.selfie) ? (d.selfie as string[]) : []);
    }, [profile?.id, profile?.verification_docs]);

    const fetchStats = async () => {
        if (!user) return;

        const { data } = await supabase
            .from('ads')
            .select('id, views')
            .eq('user_id', user.id);

        if (data) {
            const totalViews = data.reduce((acc, ad) => acc + (ad.views || 0), 0);
            setStats({ totalAds: data.length, totalViews });
        }
    };

    useEffect(() => {
        if (!user) return;
        fetchStats();
    }, [user?.id]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!name.trim()) {
            toast.error('O campo Nome Completo é obrigatório.');
            return;
        }
        if (digitsOnly(phone).length < 10) {
            toast.error('Informe um telefone com DDD.');
            return;
        }
        if (!isValidCpfOrCnpj(cpfCnpj)) {
            toast.error('Informe um CPF ou CNPJ válido.');
            return;
        }

        setLoading(true);

        try {
            const updates = {
                full_name: name,
                avatar_url: avatar[0] || null,
                phone: digitsOnly(phone),
                bio,
                state,
                city,
                website,
                instagram,
                cpf_cnpj: digitsOnly(cpfCnpj),
                updated_at: new Date().toISOString(),
            };

            // 1. Update Profile Table
            const { error } = await supabase
                .from('profiles')
                .upsert({ id: user!.id, ...updates }); // Upsert in case trigger failed

            if (error) throw error;

            // 2. Update Auth Metadata (Keep in sync for now, optional but good for redundancy)
            await supabase.auth.updateUser({
                data: updates
            });

            await refreshProfile(); // Refresh context
            toast.success('Perfil atualizado com sucesso!');
        } catch (error) {
            console.error('Error updating profile:', error);
            const message = error instanceof Error ? error.message : '';
            if (/duplicate|already exists|23505/i.test(message)) {
                toast.error('CPF/CNPJ, telefone ou e-mail já está em uso por outra conta.');
            } else {
                toast.error('Erro ao atualizar perfil.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRequestVerification = async () => {
        if (!user) return;
        if (!name.trim() || !phone.trim() || !cpfCnpj.trim() || avatar.length === 0) {
            toast.error('Preencha nome, telefone, foto de perfil e CPF/CNPJ antes de solicitar.');
            return;
        }
        if (verifyDocUrls.filter(Boolean).length < 1) {
            toast.error('Envie pelo menos uma foto nítida do documento oficial (RG ou CNH — frente e verso podem ser 2 fotos).');
            return;
        }
        if (verifySelfieUrls.filter(Boolean).length < 1) {
            toast.error('Envie uma selfie segurando o documento ao lado do rosto.');
            return;
        }

        setSubmittingVerification(true);
        try {
            const verification_docs = {
                doc: verifyDocUrls.map((u) => u.trim()).filter(Boolean),
                selfie: verifySelfieUrls.map((u) => u.trim()).filter(Boolean),
            };

            const { error } = await supabase.rpc('request_my_verification', {
                p_docs: verification_docs,
            });

            if (error) throw error;

            await refreshProfile();
            toast.success(
                'Documentos enviados! A análise pode levar até 3 dias úteis — em geral bem antes. Acompanhe o status aqui na sua conta.',
            );
        } catch (error) {
            console.error('Error requesting verification:', error);
            toast.error('Erro ao enviar solicitação de verificação.');
        } finally {
            setSubmittingVerification(false);
        }
    };

    const persistAvatar = async (avatarUrl: string | null) => {
        if (!user) return;
        setSavingAvatar(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    avatar_url: avatarUrl,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (error) throw error;

            await supabase.auth.updateUser({
                data: { avatar_url: avatarUrl },
            });

            await refreshProfile();
            toast.success(avatarUrl ? 'Foto de perfil atualizada.' : 'Foto de perfil removida.');
        } catch (error) {
            console.error('Error persisting avatar:', error);
            toast.error('Não foi possível salvar a foto de perfil.');
        } finally {
            setSavingAvatar(false);
        }
    };

    const handleAvatarUpload = (url: string) => {
        setAvatar([url]);
        void persistAvatar(url);
    };
    const handleAvatarRemove = (_url: string) => {
        setAvatar([]);
        void persistAvatar(null);
    };
    const openVerificationTab = () => setActiveTab('verification');

    const handleExportMyData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [profileRes, adsRes, favRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
                supabase.from('ads').select('*').eq('user_id', user.id),
                supabase.from('favorites').select('*').eq('user_id', user.id),
            ]);

            if (profileRes.error) throw profileRes.error;
            if (adsRes.error) throw adsRes.error;

            const payload = {
                exported_at: new Date().toISOString(),
                schema_note: 'Portabilidade LGPD — snapshot dos dados vinculados à sua conta neste momento.',
                profile: profileRes.data ?? null,
                ads: adsRes.data ?? [],
                favorites: favRes.error ? { error: favRes.error.message } : (favRes.data ?? []),
            };

            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dezzapego-meus-dados-${user.id.slice(0, 8)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Download iniciado.');
        } catch (e) {
            console.error(e);
            toast.error('Não foi possível gerar o arquivo. Tente de novo ou use o contato.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!user) return;

        const confirmDelete = window.confirm(
            'TEM CERTEZA QUE DESEJA EXCLUIR SUA CONTA?\n\n' +
            'Esta ação é irreversível. Seus anúncios, favoritos e dados da conta serão removidos conforme o fluxo técnico do site (RPC delete_own_account). ' +
            'Retenções mínimas por lei ou backup podem constar na Política de Privacidade em /privacidade.'
        );

        if (!confirmDelete) return;

        const confirmReference = window.prompt(
            'Para confirmar, digite "DELETAR" no campo abaixo:'
        );

        if (confirmReference !== 'DELETAR') {
            toast.error('Confirmação incorreta. A conta NÃO foi excluída.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.rpc('delete_own_account');

            if (error) throw error;

            await supabase.auth.signOut();
            toast.success('Sua conta foi excluída permanentemente.');
            router.push('/');
        } catch (error) {
            console.error('Error deleting account:', error);
            toast.error('Erro ao excluir conta. Tente novamente ou contate o suporte.');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || !user) return null;

    return (
        <div className="bg-gray-50 min-h-screen">
            <SEO title="Minha conta" description="Gerencie sua conta no Dezzapego." noIndex />
            <Header hideLocationFilter />

            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Minha conta</h1>
                    <p className="text-gray-600 mt-1 max-w-2xl">
                        Atualize seu perfil público e acompanhe o desempenho dos seus anúncios em um só lugar.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <aside className="lg:col-span-4 xl:col-span-3 space-y-3 lg:sticky lg:top-[4.75rem] self-start">
                        <nav className="flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={() => setActiveTab('profile')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium shadow-sm border transition-colors ${
                                    activeTab === 'profile'
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                                aria-current={activeTab === 'profile' ? 'page' : undefined}
                            >
                                <User className="w-5 h-5 shrink-0" />
                                Dados pessoais
                            </button>
                            <button
                                type="button"
                                onClick={openVerificationTab}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium shadow-sm border transition-colors ${
                                    activeTab === 'verification'
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                                aria-current={activeTab === 'verification' ? 'page' : undefined}
                            >
                                <Shield className="w-5 h-5 shrink-0" />
                                Verificação
                                {verificationBadgeText && (
                                    <span
                                        className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                            verificationStatus === 'pending'
                                                ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                                                : 'bg-red-50 text-red-700 border-red-200'
                                        }`}
                                    >
                                        {verificationBadgeText}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('settings')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium shadow-sm border transition-colors ${
                                    activeTab === 'settings'
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                                aria-current={activeTab === 'settings' ? 'page' : undefined}
                            >
                                <Shield className="w-5 h-5 shrink-0" />
                                Configurações
                            </button>
                            <Link
                                href="/meus-anuncios"
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white text-gray-700 hover:bg-gray-50 transition-colors font-medium border border-gray-200 shadow-sm"
                            >
                                <Package className="w-5 h-5 shrink-0" />
                                Meus anúncios
                                <ExternalLink className="w-4 h-4 ml-auto shrink-0 opacity-50" />
                            </Link>
                            <Link
                                href="/favoritos"
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white text-gray-700 hover:bg-gray-50 transition-colors font-medium border border-gray-200 shadow-sm"
                            >
                                <Heart className="w-5 h-5 shrink-0" />
                                Favoritos
                                <ExternalLink className="w-4 h-4 ml-auto shrink-0 opacity-50" />
                            </Link>
                        </nav>
                        <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100/80 shadow-sm">
                            <div className="flex items-center gap-2 text-blue-900 font-bold mb-3">
                                <Shield className="w-5 h-5" />
                                Resumo rápido
                            </div>
                            <dl className="space-y-3 text-sm text-blue-900/85">
                                <div className="flex justify-between gap-4 pt-2 border-t border-blue-100/80">
                                    <dt>Anúncios ativos</dt>
                                    <dd className="font-bold tabular-nums">{stats.totalAds}</dd>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <dt>Visualizações</dt>
                                    <dd className="font-bold tabular-nums">{stats.totalViews}</dd>
                                </div>
                            </dl>
                        </div>
                    </aside>

                    <div className="lg:col-span-8 xl:col-span-9 space-y-8 min-w-0">
                        {activeTab === 'profile' && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
                                <h2 className="text-xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-100">
                                    Dados Pessoais
                                </h2>

                                <div className="mb-8 rounded-xl border border-blue-100 bg-blue-50/70 p-4 sm:p-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                        <div className="flex-1">
                                            <p className="text-sm text-blue-900 leading-relaxed">
                                                <strong>Quer ganhar selo de vendedor verificado?</strong> A solicitação de
                                                documentos agora fica na aba <strong>Verificação</strong>, para manter seus
                                                dados pessoais separados.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={openVerificationTab}
                                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                                        >
                                            Quero ganhar selo
                                        </button>
                                    </div>
                                </div>
                                <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-4xl">

                                    {/* Avatar Section */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Foto de Perfil</label>
                                        <div className="flex items-start gap-4">
                                            <div className="w-32 h-32 bg-gray-100 rounded-full overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center">
                                                {avatar.length > 0 ? (
                                                    <img src={avatar[0]} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-12 h-12 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="w-full max-w-[200px]">
                                                    <ImageUpload
                                                        onUpload={handleAvatarUpload}
                                                        onRemove={handleAvatarRemove}
                                                        currentImages={avatar}
                                                        maxImages={1}
                                                        userId={user.id}
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    Recomendado: 400x400px. JPG ou PNG.
                                                    {savingAvatar ? ' Salvando foto...' : ''}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Name */}
                                        <div className="space-y-2">
                                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                                Nome Completo <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                id="name"
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Seu nome"
                                            />
                                        </div>

                                        {/* Email (Read Only) */}
                                        <div className="space-y-2">
                                            <label htmlFor="emailDisplay" className="block text-sm font-medium text-gray-500">
                                                Email <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                id="emailDisplay"
                                                type="email"
                                                value={user?.email || ''}
                                                disabled
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                                            />
                                        </div>

                                        {/* Phone */}
                                        <div className="space-y-2">
                                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                                                Telefone / WhatsApp <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                id="phone"
                                                type="text"
                                                value={phone}
                                                onChange={(e) => setPhone(formatPhone(e.target.value))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="(11) 99999-9999"
                                            />
                                        </div>

                                        {/* CPF/CNPJ */}
                                        <div className="space-y-2">
                                            <label htmlFor="cpfCnpj" className="block text-sm font-medium text-gray-700">
                                                CPF ou CNPJ <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                id="cpfCnpj"
                                                type="text"
                                                value={cpfCnpj}
                                                onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                                                disabled={digitsOnly(cpfCnpj).length > 0}
                                                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                    digitsOnly(cpfCnpj).length > 0 ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                                                }`}
                                                placeholder="000.000.000-00"
                                                title={digitsOnly(cpfCnpj).length > 0 ? 'CPF/CNPJ já preenchido não pode ser alterado' : ''}
                                            />
                                            {digitsOnly(cpfCnpj).length > 0 && (
                                                <p className="text-xs text-gray-400">CPF/CNPJ já preenchido não pode ser alterado.</p>
                                            )}
                                        </div>

                                        {/* Location */}
                                        <div className="space-y-2">
                                            <label htmlFor="state" className="block text-sm font-medium text-gray-700">Estado (UF)</label>
                                            <input
                                                id="state"
                                                type="text"
                                                maxLength={2}
                                                value={state}
                                                onChange={(e) => setState(e.target.value.toUpperCase())}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="SP"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="city" className="block text-sm font-medium text-gray-700">Cidade</label>
                                            <input
                                                id="city"
                                                type="text"
                                                value={city}
                                                onChange={(e) => setCity(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="São Paulo"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="instagram" className="block text-sm font-medium text-gray-700">Instagram</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                                                <input
                                                    id="instagram"
                                                    type="text"
                                                    value={instagram}
                                                    onChange={(e) => setInstagram(e.target.value)}
                                                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="usuario"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="website" className="block text-sm font-medium text-gray-700">Site / Link</label>
                                            <input
                                                id="website"
                                                type="url"
                                                value={website}
                                                onChange={(e) => setWebsite(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="https://seusite.com"
                                            />
                                        </div>
                                    </div>

                                    {/* Bio */}
                                    <div className="space-y-2">
                                        <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                                            Bio / Sobre mim
                                        </label>
                                        <textarea
                                            id="bio"
                                            rows={4}
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                            placeholder="Conte um pouco sobre você ou sua loja..."
                                        />
                                        <p className="text-xs text-gray-500 text-right">{bio.length}/500</p>
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                        >
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                            Salvar Alterações
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {activeTab === 'verification' && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
                                <h2 className="text-xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-100">
                                    Verificação de conta (selo de vendedor)
                                </h2>
                                <div className="rounded-xl border border-gray-100 bg-gray-50/80 overflow-hidden">
                                    <div className="px-5 pt-5">
                                        <p className="text-sm text-blue-900 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 leading-relaxed">
                                            <strong>Prazo de análise:</strong> conferimos documentos em até{' '}
                                            <strong>3 dias úteis</strong>. Você será avisado por aqui assim que houver resultado.
                                        </p>
                                    </div>
                                    <div className="p-5 flex flex-col md:flex-row items-start md:items-center gap-4 border-b border-gray-100 bg-gray-50">
                                        <div className={`p-3 rounded-full border shadow-sm ${
                                            verificationStatus === 'verified'
                                                ? 'bg-white border-green-100 text-green-600'
                                                : verificationStatus === 'rejected'
                                                  ? 'bg-white border-red-100 text-red-600'
                                                  : 'bg-white border-gray-100 text-blue-600'
                                        }`}>
                                            {verificationStatus === 'verified' ? (
                                                <ShieldCheck className="w-6 h-6" />
                                            ) : verificationStatus === 'rejected' ? (
                                                <AlertCircle className="w-6 h-6" />
                                            ) : (
                                                <Shield className="w-6 h-6" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-bold text-gray-900 flex flex-wrap items-center gap-2">
                                                Status da verificação
                                                {verificationStatus === 'verified' && (
                                                    <span className="text-green-700 text-xs bg-green-50 px-2 py-0.5 rounded-full border border-green-100">Verificado</span>
                                                )}
                                                {verificationStatus === 'pending' && (
                                                    <span className="text-yellow-800 text-xs bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100">Em análise</span>
                                                )}
                                                {verificationStatus === 'rejected' && (
                                                    <span className="text-red-700 text-xs bg-red-50 px-2 py-0.5 rounded-full border border-red-100">Solicitação recusada</span>
                                                )}
                                            </h3>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {verificationStatus === 'verified' &&
                                                    'Parabéns! Seu nome de exibição ganha o selo de verificado nos anúncios e lista de busca.'}
                                                {verificationStatus === 'pending' &&
                                                    'Estamos revisando suas fotos e dados. O prazo é de até 3 dias úteis; você será avisado por aqui assim que houver decisão.'}
                                                {verificationStatus === 'rejected' &&
                                                    'Revise as orientações abaixo, envie novas imagens claras e envie outra solicitação — o novo pedido será analisado em até 3 dias úteis.'}
                                                {verificationStatus === 'none' &&
                                                    'Envie RG ou CNH (frente e verso) e uma selfie com o documento ao lado do rosto. Após o envio, o status pode levar até 3 dias úteis para ser atualizado.'}
                                            </p>
                                            {verificationStatus === 'rejected' && profile?.verification_rejection_reason?.trim() && (
                                                <p className="text-sm text-red-800 mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
                                                    <strong>Motivo:</strong> {profile.verification_rejection_reason.trim()}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {(verificationStatus === 'pending' || verificationStatus === 'verified') &&
                                        ((verifyDocUrls.length > 0 || verifySelfieUrls.length > 0) ? (
                                            <div className="p-5 grid md:grid-cols-2 gap-4 bg-white">
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Documento enviado</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {verifyDocUrls.map((url) => (
                                                            <img key={url} src={url} alt="" className="h-28 w-auto rounded-lg border border-gray-200 object-cover" />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Selfie com documento</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {verifySelfieUrls.map((url) => (
                                                            <img key={url} src={url} alt="" className="h-28 w-auto rounded-lg border border-gray-200 object-cover" />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null)}

                                    {(verificationStatus === 'none' || verificationStatus === 'rejected') && (
                                        <div className="p-5 space-y-6 bg-white">
                                            <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-900">
                                                <p className="font-semibold mb-1">Dicas para aprovação rápida</p>
                                                <ul className="list-disc list-inside space-y-1 text-amber-900/90">
                                                    <li>Iluminação uniforme — evite reflexo forte no plástico do RG.</li>
                                                    <li>Na selfie, seu rosto e os dados do documento devem aparecer legíveis.</li>
                                                    <li>Formatos JPG/PNG; as imagens são convertidas para WebP no envio.</li>
                                                </ul>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="block text-sm font-medium text-gray-800">RG ou CNH (até 2 fotos: frente e verso)</label>
                                                <ImageUpload
                                                    userId={user.id}
                                                    uploadSubfolder="verification"
                                                    maxImages={2}
                                                    currentImages={verifyDocUrls}
                                                    onUpload={(url) => setVerifyDocUrls((prev) => [...prev, url])}
                                                    onRemove={(url) => setVerifyDocUrls((prev) => prev.filter((u) => u !== url))}
                                                    onReorder={setVerifyDocUrls}
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="block text-sm font-medium text-gray-800">
                                                    Selfie segurando o documento ao lado do rosto <span className="text-red-500">*</span>
                                                </label>
                                                <ImageUpload
                                                    userId={user.id}
                                                    uploadSubfolder="verification"
                                                    maxImages={1}
                                                    currentImages={verifySelfieUrls}
                                                    onUpload={(url) => setVerifySelfieUrls([url])}
                                                    onRemove={() => setVerifySelfieUrls([])}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleRequestVerification}
                                                disabled={submittingVerification}
                                                className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                            >
                                                {submittingVerification ? 'Enviando...' : 'Enviar documentos para análise'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <>
                                <section className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm" aria-labelledby="settings-quick-actions-title">
                                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-gray-700 shrink-0" />
                                        <h3 id="settings-quick-actions-title" className="text-lg font-bold text-gray-900">
                                            Atalhos úteis
                                        </h3>
                                    </div>
                                    <div className="p-6 space-y-3">
                                        <Link
                                            href="/meus-anuncios"
                                            className="block w-full rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                        >
                                            Gerenciar meus anúncios
                                        </Link>
                                    </div>
                                </section>

                                <section
                                    className="border border-indigo-200 rounded-xl overflow-hidden bg-white shadow-sm"
                                    aria-labelledby="lgpd-data-title"
                                >
                                    <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-indigo-700 shrink-0" />
                                        <h3 id="lgpd-data-title" className="text-lg font-bold text-indigo-900">
                                            Seus dados (LGPD)
                                        </h3>
                                    </div>
                                    <div className="p-6 space-y-4 text-gray-700 text-sm leading-relaxed">
                                        <p>
                                            Você tem direito de <strong>acessar</strong> e <strong>portar</strong> seus dados em
                                            formato legível. Use o botão abaixo para baixar um JSON com seu perfil, anúncios e
                                            favoritos (quando permitido pelas permissões do banco).
                                        </p>
                                        <p>
                                            Para <strong>excluir</strong> definitivamente a conta e os dados tratados nesse
                                            fluxo, use a opção na zona de perigo — o sistema chama a função{' '}
                                            <code className="text-xs bg-gray-100 px-1 rounded">delete_own_account</code>. Prazos
                                            de backups e retenções legais estão descritos na{' '}
                                            <Link href="/privacidade" className="text-blue-600 font-medium hover:underline">
                                                Política de Privacidade
                                            </Link>
                                            .
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleExportMyData}
                                            disabled={loading}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-indigo-200 bg-white text-indigo-800 font-medium hover:bg-indigo-50 disabled:opacity-50"
                                        >
                                            <Download className="w-4 h-4" />
                                            Baixar meus dados (JSON)
                                        </button>
                                    </div>
                                </section>

                                <section className="border border-red-200 rounded-xl overflow-hidden bg-white shadow-sm" aria-labelledby="danger-zone-title">
                                    <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-red-600 shrink-0" />
                                        <h3 id="danger-zone-title" className="text-lg font-bold text-red-700">
                                            Zona de perigo
                                        </h3>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-gray-600 mb-4">
                                            A exclusão da conta remove anúncios e dados vinculados ao seu usuário no fluxo
                                            previsto pelo sistema. Esta ação é irreversível.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleDeleteAccount}
                                            className="px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                        >
                                            Excluir minha conta
                                        </button>
                                    </div>
                                </section>
                            </>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}
