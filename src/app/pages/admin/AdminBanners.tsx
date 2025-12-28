import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Loader2, Trash2, Plus, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminBanners() {
    const [banners, setBanners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchBanners();
    }, []);

    async function fetchBanners() {
        try {
            const { data, error } = await supabase
                .from('banners')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBanners(data || []);
        } catch (error) {
            console.error('Error fetching banners:', error);
            // Don't show toast error initially as table might not exist
        } finally {
            setLoading(false);
        }
    }

    async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
        if (!event.target.files || event.target.files.length === 0) return;

        const file = event.target.files[0];
        setUploading(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `banner_${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to 'banners' bucket (or fallback to 'ads' if not created)
            let { error: uploadError } = await supabase.storage
                .from('banners')
                .upload(filePath, file);

            // Fallback bucket logic if 'banners' bucket missing
            let bucketName = 'banners';
            if (uploadError && (uploadError as any).statusCode === 404) {
                const { error: fallbackError } = await supabase.storage
                    .from('ads')
                    .upload(filePath, file);
                if (fallbackError) throw fallbackError;
                bucketName = 'ads';
            } else if (uploadError) {
                throw uploadError;
            }

            const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);

            // Save to DB
            const { data: insertData, error: dbError } = await supabase
                .from('banners')
                .insert({
                    image_url: publicUrlData.publicUrl,
                    active: true
                })
                .select()
                .single();

            if (dbError) throw dbError;

            setBanners(prev => [insertData, ...prev]);
            toast.success('Banner adicionado com sucesso!');

        } catch (error: any) {
            console.error('Error uploading banner:', error);
            toast.error('Erro ao fazer upload do banner.');
        } finally {
            setUploading(false);
            event.target.value = '';
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Tem certeza que deseja excluir esse banner?')) return;

        try {
            const { error } = await supabase.from('banners').delete().eq('id', id);
            if (error) throw error;

            setBanners(prev => prev.filter(b => b.id !== id));
            toast.success('Banner removido.');
        } catch (error) {
            console.error('Error deleting banner:', error);
            toast.error('Erro ao remover banner.');
        }
    }

    async function toggleActive(banner: any) {
        try {
            const newStatus = !banner.active;
            const { error } = await supabase
                .from('banners')
                .update({ active: newStatus })
                .eq('id', banner.id);

            if (error) throw error;

            setBanners(prev => prev.map(b =>
                b.id === banner.id ? { ...b, active: newStatus } : b
            ));
            toast.success(`Banner ${newStatus ? 'ativado' : 'desativado'}.`);
        } catch (error) {
            console.error('Error toggling banner:', error);
            toast.error('Erro ao alterar status.');
        }
    }

    async function handleUpdateLink(id: string, link: string) {
        try {
            const { error } = await supabase
                .from('banners')
                .update({ link })
                .eq('id', id);

            if (error) throw error;
            toast.success('Link atualizado.');
        } catch (error) {
            console.error('Error updating link:', error);
            toast.error('Erro ao atualizar link.');
        }
    }

    if (loading) return <div className="p-8">Carregando banners...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Gerenciar Banners</h1>

                <label className={`
                    flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg 
                    hover:bg-blue-700 transition-colors cursor-pointer
                    ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                `}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {uploading ? 'Enviando...' : 'Novo Banner'}
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUpload}
                        disabled={uploading}
                    />
                </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {banners.map(banner => (
                    <div key={banner.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group">
                        <div className="relative aspect-video bg-gray-100">
                            <img
                                src={banner.image_url}
                                alt="Banner"
                                className={`w-full h-full object-cover transition-opacity ${banner.active ? '' : 'opacity-50 grayscale'}`}
                            />
                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => toggleActive(banner)}
                                    className="p-1.5 bg-white text-gray-600 rounded-lg shadow-sm hover:text-blue-600"
                                    title={banner.active ? "Desativar" : "Ativar"}
                                >
                                    {banner.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => handleDelete(banner.id)}
                                    className="p-1.5 bg-white text-gray-600 rounded-lg shadow-sm hover:text-red-600"
                                    title="Excluir"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            {!banner.active && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                                        Inativo
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="p-3 bg-gray-50 border-t border-gray-100">
                            <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                                <span>Adicionado em {new Date(banner.created_at).toLocaleDateString()}</span>
                                <span className={`w-2 h-2 rounded-full ${banner.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Link (opcional)"
                                    defaultValue={banner.link || ''}
                                    onBlur={(e) => handleUpdateLink(banner.id, e.target.value)}
                                    className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                ))}

                {banners.length === 0 && (
                    <div className="col-span-full border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center text-gray-400">
                        <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
                        <p>Nenhum banner cadastrado.</p>
                        <p className="text-sm">Envie uma imagem para começar.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
