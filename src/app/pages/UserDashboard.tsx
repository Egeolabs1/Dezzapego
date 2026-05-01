import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Header } from '../components/Header';
import { ImageUpload } from '../components/ImageUpload';
import { Loader2, User, Save, Package, Shield, ExternalLink, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';

export default function UserDashboard() {
    const { user, profile, refreshProfile } = useAuth(); // ADDED profile, refreshProfile
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
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
    // Use profile status or default
    const verificationStatus = profile?.verification_status || 'none';

    // Stats State
    const [stats, setStats] = useState({ totalAds: 0, totalViews: 0 });

    useEffect(() => {
        if (user) {
            // Prioritize profile data, fallback to metadata (migration) or empty
            setName(profile?.full_name || user.user_metadata?.full_name || '');
            setPhone(profile?.phone || user.user_metadata?.phone || '');
            setBio(profile?.bio || user.user_metadata?.bio || '');
            setState(profile?.state || user.user_metadata?.state || '');
            setCity(profile?.city || user.user_metadata?.city || '');
            setWebsite(profile?.website || user.user_metadata?.website || '');
            setInstagram(profile?.instagram || user.user_metadata?.instagram || '');
            setCpfCnpj(profile?.cpf_cnpj || user.user_metadata?.cpf_cnpj || '');

            if (profile?.avatar_url) {
                setAvatar([profile.avatar_url]);
            } else if (user.user_metadata?.avatar_url) {
                setAvatar([user.user_metadata.avatar_url]);
            }

            fetchStats();
        } else {
            navigate('/login');
        }
    }, [user, profile, navigate]); // Added profile dependency

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

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!name.trim()) {
            toast.error('O campo Nome Completo é obrigatório.');
            return;
        }
        if (!phone.trim()) {
            toast.error('O campo Telefone é obrigatório.');
            return;
        }
        if (!cpfCnpj.trim()) {
            toast.error('O campo CPF/CNPJ é obrigatório.');
            return;
        }

        setLoading(true);

        try {
            const updates = {
                full_name: name,
                avatar_url: avatar[0] || null,
                phone,
                bio,
                state,
                city,
                website,
                instagram,
                cpf_cnpj: cpfCnpj,
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
            toast.error('Erro ao atualizar perfil.');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestVerification = async () => {
        if (!user) return;
        if (!name || !phone || !cpfCnpj || avatar.length === 0) {
            toast.error('Complete seu perfil (Nome, Telefone, Avatar e CPF/CNPJ) para solicitar verificação.');
            return;
        }

        setSubmittingVerification(true);
        try {
            // Update Profile Table
            const { error } = await supabase
                .from('profiles')
                .update({
                    verification_status: 'pending',
                    verified: false
                })
                .eq('id', user.id);

            if (error) throw error;

            await refreshProfile();
            toast.success('Solicitação enviada! Analisaremos seu perfil em breve.');
        } catch (error) {
            console.error('Error requesting verification:', error);
            toast.error('Erro ao solicitar verificação.');
        } finally {
            setSubmittingVerification(false);
        }
    };

    const handleAvatarUpload = (url: string) => setAvatar([url]);
    const handleAvatarRemove = (_url: string) => setAvatar([]);

    const handleDeleteAccount = async () => {
        if (!user) return;

        const confirmDelete = window.confirm(
            'TEM CERTEZA QUE DESEJA EXCLUIR SUA CONTA?\n\n' +
            'Esta ação é irreversível. Todos os seus dados, anúncios e fotos serão apagados permanentemente.'
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
            navigate('/');
        } catch (error) {
            console.error('Error deleting account:', error);
            toast.error('Erro ao excluir conta. Tente novamente ou contate o suporte.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="bg-gray-50 min-h-screen">
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
                            <div
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium shadow-sm border bg-blue-600 text-white border-blue-600"
                                aria-current="page"
                            >
                                <User className="w-5 h-5 shrink-0" />
                                Meu perfil
                            </div>
                            <Link
                                to="/meus-anuncios"
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white text-gray-700 hover:bg-gray-50 transition-colors font-medium border border-gray-200 shadow-sm"
                            >
                                <Package className="w-5 h-5 shrink-0" />
                                Meus anúncios
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
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
                                <h2 className="text-xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-100">
                                    Edição de Perfil
                                </h2>

                                {/* Verification Status Section */}
                                <div className="mb-8 p-5 bg-gray-50 rounded-xl border border-gray-100 flex flex-col md:flex-row items-start md:items-center gap-4">
                                    <div className="p-3 bg-white rounded-full border border-gray-100 shadow-sm text-blue-600">
                                        {verificationStatus === 'verified' ? <ShieldCheck className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                            Verificação de Conta
                                            {verificationStatus === 'verified' && <span className="text-blue-600 text-xs bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Verificado com Sucesso</span>}
                                            {verificationStatus === 'pending' && <span className="text-yellow-600 text-xs bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100">Em Análise</span>}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {verificationStatus === 'verified'
                                                ? 'Sua conta está verificada! Você possui o selo de autenticidade em seus anúncios.'
                                                : verificationStatus === 'pending'
                                                    ? 'Sua solicitação está sendo analisada pela nossa equipe. Responderemos em breve.'
                                                    : 'Obtenha o selo de verificado para transmitir mais confiança aos compradores.'}
                                        </p>
                                    </div>
                                    {verificationStatus === 'none' && (
                                        <button
                                            onClick={handleRequestVerification}
                                            disabled={submittingVerification}
                                            className="whitespace-nowrap px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                        >
                                            {submittingVerification ? 'Enviando...' : 'Solicitar Verificação'}
                                        </button>
                                    )}
                                </div>

                                <h2 className="text-lg font-bold text-gray-800 mb-6 pb-4 border-b border-gray-100">
                                    Dados Pessoais
                                </h2>

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
                                                <p className="text-xs text-gray-500 mt-2">Recomendado: 400x400px. JPG ou PNG.</p>
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
                                                onChange={(e) => setPhone(e.target.value)}
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
                                                onChange={(e) => setCpfCnpj(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="000.000.000-00"
                                            />
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

                        <section className="border border-red-200 rounded-xl overflow-hidden bg-white shadow-sm" aria-labelledby="danger-zone-title">
                            <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-red-600 shrink-0" />
                                <h3 id="danger-zone-title" className="text-lg font-bold text-red-700">
                                    Zona de perigo
                                </h3>
                            </div>
                            <div className="p-6">
                                <p className="text-gray-600 mb-4">
                                    Ao excluir sua conta, seus anúncios e dados serão removidos de forma irreversível.
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
                    </div>
                </div>
            </div>

        </div>
    );
}
