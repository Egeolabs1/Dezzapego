import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Header } from '../components/Header';
import { ImageUpload } from '../components/ImageUpload'; // Reusing existing image upload
import { Loader2, User, Save, Package, Shield, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';

export default function UserDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'ads'>('profile');

    // Form State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [avatar, setAvatar] = useState<string[]>([]); // Array for ImageUpload compatibility

    // Stats State
    const [stats, setStats] = useState({ totalAds: 0, totalViews: 0 });

    useEffect(() => {
        if (user) {
            setName(user.user_metadata?.full_name || '');
            setPhone(user.user_metadata?.phone || '');
            if (user.user_metadata?.avatar_url) {
                setAvatar([user.user_metadata.avatar_url]);
            }
            fetchStats();
        } else {
            navigate('/login');
        }
    }, [user, navigate]);

    const fetchStats = async () => {
        if (!user) return;

        const { data, error } = await supabase
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
        setLoading(true);

        try {
            const updates: any = {
                data: {
                    full_name: name,
                    phone: phone,
                    avatar_url: avatar[0] || null
                }
            };

            const { error } = await supabase.auth.updateUser(updates);

            if (error) throw error;
            toast.success('Perfil atualizado com sucesso!');
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Erro ao atualizar perfil.');
        } finally {
            setLoading(false);
        }
    };

    // Wrapper for ImageUpload
    const handleAvatarUpload = (url: string) => {
        setAvatar([url]);
    };
    const handleAvatarRemove = (_url: string) => {
        setAvatar([]);
    };

    if (!user) return null;

    return (
        <div className="bg-gray-50 min-h-screen">
            <Header
                searchQuery=""
                onSearchChange={() => { }}
                onLogoClick={() => navigate('/')}
                selectedState=""
                selectedCity=""
                onLocationChange={() => { }}
            />

            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Minha Conta</h1>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Sidebar Navigation */}
                    <div className="md:col-span-1 space-y-2">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${activeTab === 'profile' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <User className="w-5 h-5" />
                            Meu Perfil
                        </button>
                        <Link to="/meus-anuncios">
                            <button
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white text-gray-700 hover:bg-gray-100 transition-colors font-medium border border-transparent hover:border-gray-200"
                            >
                                <Package className="w-5 h-5" />
                                Meus Anúncios
                                <ExternalLink className="w-4 h-4 ml-auto opacity-50" />
                            </button>
                        </Link>
                        <div className="p-4 bg-blue-50 rounded-lg mt-4 border border-blue-100">
                            <div className="flex items-center gap-2 text-blue-800 font-bold mb-2">
                                <Shield className="w-4 h-4" />
                                Status da Conta
                            </div>
                            <div className="space-y-2 text-sm text-blue-700">
                                <div className="flex justify-between">
                                    <span>Anúncios Ativos:</span>
                                    <span className="font-bold">{stats.totalAds}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Visualizações:</span>
                                    <span className="font-bold">{stats.totalViews}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="md:col-span-3">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-100">
                                Editar Informações
                            </h2>

                            <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl">

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
                                            {/* Trying to reuse ImageUpload but simpler, or just use it as is */}
                                            <div className="w-full max-w-[200px]">
                                                <ImageUpload
                                                    onUpload={handleAvatarUpload}
                                                    onRemove={handleAvatarRemove}
                                                    currentImages={avatar}
                                                    maxImages={1}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">Recomendado: 400x400px. JPG ou PNG.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                            Nome Completo
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

                                    <div className="space-y-2">
                                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                                            Telefone / WhatsApp
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
                    </div>
                </div>
            </div>
        </div>
    );
}
