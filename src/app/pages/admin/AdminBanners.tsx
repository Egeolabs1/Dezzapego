import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
    CalendarClock,
    ExternalLink,
    Image as ImageIcon,
    Loader2,
    Monitor,
    Plus,
    Save,
    Smartphone,
    Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { convertImageFileToWebp } from '../../../lib/imageToWebp';

type Banner = {
    id: string;
    image_url: string;
    mobile_image_url: string | null;
    title: string | null;
    subtitle: string | null;
    cta_label: string | null;
    link: string | null;
    alt_text: string | null;
    placement: string | null;
    active: boolean;
    sort_order: number | null;
    start_at: string | null;
    end_at: string | null;
    created_at: string | null;
    updated_at: string | null;
};

const PLACEMENTS = [
    { value: 'home_hero', label: 'Home - banner principal', help: 'Primeiro banner da pagina inicial.' },
    { value: 'home_top', label: 'Home - topo secundario', help: 'Aparece abaixo do banner principal, somente na Home.' },
    { value: 'category_top', label: 'Topo de categorias', help: 'Aparece nas paginas de categoria, acima da lista de anuncios.' }
];

const CONTROL_CLASS = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const DESKTOP_BANNER_SPEC = 'Desktop: 1920 x 720 px, proporcao 8:3, ate 3 MB, JPG/PNG/WebP';
const MOBILE_BANNER_SPEC = 'Mobile: 1080 x 1350 px, proporcao 4:5, ate 3 MB, JPG/PNG/WebP';

function emptyToNull(value: string | null | undefined) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}

function toInputDateTime(value: string | null) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string | null | undefined) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isBannerLive(banner: Banner) {
    if (!banner.active) return false;
    const now = Date.now();
    const startsAfterNow = banner.start_at ? new Date(banner.start_at).getTime() > now : false;
    const endedBeforeNow = banner.end_at ? new Date(banner.end_at).getTime() < now : false;
    return !startsAfterNow && !endedBeforeNow;
}

function isMissingBucketError(error: unknown) {
    if (!error || typeof error !== 'object') return false;
    const storageError = error as { statusCode?: number | string; message?: string };
    return String(storageError.message || '').toLowerCase().includes('bucket not found')
        || String(storageError.statusCode || '') === '404';
}

function getPlacementHelp(value: string | null | undefined) {
    return PLACEMENTS.find((placement) => placement.value === value)?.help || PLACEMENTS[0].help;
}

export default function AdminBanners() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);

    useEffect(() => {
        fetchBanners();
    }, []);

    const stats = useMemo(() => {
        const active = banners.filter((banner) => banner.active).length;
        const live = banners.filter(isBannerLive).length;
        return {
            total: banners.length,
            active,
            live,
            inactive: banners.length - active
        };
    }, [banners]);

    async function fetchBanners() {
        try {
            const { data, error } = await supabase
                .from('banners')
                .select('*')
                .order('sort_order', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBanners((data || []) as Banner[]);
        } catch (error) {
            console.error('Error fetching banners:', error);
            toast.error('Nao foi possivel carregar os banners. Verifique se o SQL atualizado foi aplicado.');
        } finally {
            setLoading(false);
        }
    }

    async function uploadImage(rawFile: File) {
        const file = await convertImageFileToWebp(rawFile, { maxEdge: 3200 });
        const fileName = `banner_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}.webp`;
        const uploadOpts = {
            contentType: file.type || 'image/webp',
            upsert: false as const
        };

        let bucketName = 'banners';
        const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, file, uploadOpts);

        if (isMissingBucketError(uploadError)) {
            bucketName = 'ads';
            const { error: fallbackError } = await supabase.storage
                .from(bucketName)
                .upload(fileName, file, uploadOpts);
            if (fallbackError) throw fallbackError;
        } else if (uploadError) {
            throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
        return publicUrlData.publicUrl;
    }

    async function handleCreateUpload(event: React.ChangeEvent<HTMLInputElement>) {
        if (!event.target.files?.length) return;
        setUploading(true);

        try {
            const imageUrl = await uploadImage(event.target.files[0]);
            const nextSortOrder = Math.max(0, ...banners.map((banner) => banner.sort_order ?? 0)) + 10;
            const { data, error } = await supabase
                .from('banners')
                .insert({
                    image_url: imageUrl,
                    active: true,
                    placement: 'home_hero',
                    sort_order: nextSortOrder,
                    alt_text: 'Banner promocional Dezzapego'
                })
                .select()
                .single();

            if (error) throw error;

            setBanners((prev) => [data as Banner, ...prev]);
            toast.success('Banner criado. Complete os detalhes e salve.');
        } catch (error) {
            console.error('Error uploading banner:', error);
            toast.error('Erro ao criar banner. Verifique se existe o bucket publico "banners" ou "ads" no Supabase Storage.');
        } finally {
            setUploading(false);
            event.target.value = '';
        }
    }

    async function handleReplaceImage(event: React.ChangeEvent<HTMLInputElement>, banner: Banner, field: 'image_url' | 'mobile_image_url') {
        if (!event.target.files?.length) return;
        setSavingId(banner.id);

        try {
            const imageUrl = await uploadImage(event.target.files[0]);
            const { error } = await supabase.from('banners').update({ [field]: imageUrl }).eq('id', banner.id);
            if (error) throw error;

            setBanners((prev) => prev.map((item) => item.id === banner.id ? { ...item, [field]: imageUrl } : item));
            toast.success(field === 'image_url' ? 'Imagem desktop atualizada.' : 'Imagem mobile atualizada.');
        } catch (error) {
            console.error('Error replacing banner image:', error);
            toast.error('Erro ao atualizar imagem. Verifique o bucket publico de storage.');
        } finally {
            setSavingId(null);
            event.target.value = '';
        }
    }

    async function handleSave(banner: Banner) {
        if (banner.start_at && banner.end_at && new Date(banner.end_at).getTime() <= new Date(banner.start_at).getTime()) {
            toast.error('A data final precisa ser depois da data inicial.');
            return;
        }

        setSavingId(banner.id);
        try {
            const payload = {
                title: emptyToNull(banner.title),
                subtitle: emptyToNull(banner.subtitle),
                cta_label: emptyToNull(banner.cta_label),
                link: emptyToNull(banner.link),
                alt_text: emptyToNull(banner.alt_text),
                placement: banner.placement || 'home_hero',
                active: banner.active,
                sort_order: Number(banner.sort_order ?? 0),
                start_at: toIsoDateTime(banner.start_at),
                end_at: toIsoDateTime(banner.end_at),
                mobile_image_url: emptyToNull(banner.mobile_image_url)
            };

            const { data, error } = await supabase
                .from('banners')
                .update(payload)
                .eq('id', banner.id)
                .select()
                .single();

            if (error) throw error;

            setBanners((prev) => prev.map((item) => item.id === banner.id ? data as Banner : item));
            toast.success('Banner salvo.');
        } catch (error) {
            console.error('Error saving banner:', error);
            toast.error('Erro ao salvar banner. Confirme que o SQL atualizado foi aplicado.');
        } finally {
            setSavingId(null);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Tem certeza que deseja excluir esse banner?')) return;

        try {
            const { error } = await supabase.from('banners').delete().eq('id', id);
            if (error) throw error;

            setBanners((prev) => prev.filter((banner) => banner.id !== id));
            toast.success('Banner removido.');
        } catch (error) {
            console.error('Error deleting banner:', error);
            toast.error('Erro ao remover banner.');
        }
    }

    function updateBanner(id: string, patch: Partial<Banner>) {
        setBanners((prev) => prev.map((banner) => banner.id === id ? { ...banner, ...patch } : banner));
    }

    if (loading) return <div className="p-8">Carregando banners...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Gerenciar banners</h1>
                    <p className="mt-1 text-sm text-gray-500">Configure imagem, texto, link, ordem e periodo de exibicao.</p>
                </div>

                <label className={`flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 ${uploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {uploading ? 'Enviando...' : 'Novo banner'}
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCreateUpload}
                        disabled={uploading}
                    />
                </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                <SpecCard
                    icon={<Monitor className="h-5 w-5" />}
                    title="Imagem desktop"
                    description={DESKTOP_BANNER_SPEC}
                    note="Use area segura no centro: evite texto importante nas bordas."
                />
                <SpecCard
                    icon={<Smartphone className="h-5 w-5" />}
                    title="Imagem mobile"
                    description={MOBILE_BANNER_SPEC}
                    note="Opcional, mas recomendada para evitar cortes no celular."
                />
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label="Total" value={stats.total} />
                <StatCard label="Ativos" value={stats.active} />
                <StatCard label="No ar agora" value={stats.live} />
                <StatCard label="Inativos" value={stats.inactive} />
            </div>

            <div className="space-y-4">
                {banners.map((banner) => (
                    <section key={banner.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        <div className="grid gap-0 lg:grid-cols-[360px_1fr]">
                            <div className="border-b border-gray-100 bg-gray-50 lg:border-b-0 lg:border-r">
                                <div className="relative aspect-video bg-gray-100">
                                    <img
                                        src={banner.image_url}
                                        alt={banner.alt_text || banner.title || 'Banner'}
                                        className={`h-full w-full object-cover ${banner.active ? '' : 'opacity-50 grayscale'}`}
                                    />
                                    <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                                        {isBannerLive(banner) ? 'No ar' : banner.active ? 'Agendado/fora do periodo' : 'Inativo'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 p-3">
                                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:border-blue-300">
                                        <Monitor className="h-4 w-4" />
                                        Desktop
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(event) => handleReplaceImage(event, banner, 'image_url')}
                                            disabled={savingId === banner.id}
                                        />
                                    </label>
                                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:border-blue-300">
                                        <Smartphone className="h-4 w-4" />
                                        Mobile
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(event) => handleReplaceImage(event, banner, 'mobile_image_url')}
                                            disabled={savingId === banner.id}
                                        />
                                    </label>
                                </div>
                                <div className="px-3 pb-3 text-[11px] leading-5 text-gray-500">
                                    <p>{DESKTOP_BANNER_SPEC}</p>
                                    <p>{MOBILE_BANNER_SPEC}</p>
                                </div>

                                {banner.mobile_image_url && (
                                    <div className="px-3 pb-3">
                                        <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white p-2 text-xs text-gray-500">
                                            <Smartphone className="h-4 w-4" />
                                            Imagem mobile configurada
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 p-4">
                                <div className="grid gap-3 md:grid-cols-[1fr_160px_170px]">
                                    <Field label="Titulo">
                                        <input
                                            value={banner.title || ''}
                                            onChange={(event) => updateBanner(banner.id, { title: event.target.value })}
                                            placeholder="Titulo exibido sobre o banner"
                                            className={CONTROL_CLASS}
                                        />
                                    </Field>
                                    <Field label="Posicao">
                                        <input
                                            type="number"
                                            value={banner.sort_order ?? 0}
                                            onChange={(event) => updateBanner(banner.id, { sort_order: Number(event.target.value) })}
                                            className={CONTROL_CLASS}
                                        />
                                    </Field>
                                    <Field label="Local">
                                        <select
                                            value={banner.placement || 'home_hero'}
                                            onChange={(event) => updateBanner(banner.id, { placement: event.target.value })}
                                            className={CONTROL_CLASS}
                                        >
                                            {PLACEMENTS.map((placement) => (
                                                <option key={placement.value} value={placement.value}>{placement.label}</option>
                                            ))}
                                        </select>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {getPlacementHelp(banner.placement)}
                                        </p>
                                    </Field>
                                </div>

                                <Field label="Subtitulo">
                                    <textarea
                                        value={banner.subtitle || ''}
                                        onChange={(event) => updateBanner(banner.id, { subtitle: event.target.value })}
                                        placeholder="Texto de apoio exibido sobre o banner"
                                        rows={2}
                                        className={`${CONTROL_CLASS} resize-none`}
                                    />
                                </Field>

                                <div className="grid gap-3 md:grid-cols-2">
                                    <Field label="Texto do botao">
                                        <input
                                            value={banner.cta_label || ''}
                                            onChange={(event) => updateBanner(banner.id, { cta_label: event.target.value })}
                                            placeholder="Ex.: Ver ofertas"
                                            className={CONTROL_CLASS}
                                        />
                                    </Field>
                                    <Field label="Link de destino">
                                        <input
                                            value={banner.link || ''}
                                            onChange={(event) => updateBanner(banner.id, { link: event.target.value })}
                                            placeholder="/categoria/moveis ou https://..."
                                            className={CONTROL_CLASS}
                                        />
                                    </Field>
                                </div>

                                <Field label="Texto alternativo da imagem">
                                    <input
                                        value={banner.alt_text || ''}
                                        onChange={(event) => updateBanner(banner.id, { alt_text: event.target.value })}
                                        placeholder="Descreva a imagem para SEO e acessibilidade"
                                        className={CONTROL_CLASS}
                                    />
                                </Field>

                                <div className="grid gap-3 md:grid-cols-2">
                                    <Field label="Inicio da exibicao">
                                        <div className="relative">
                                            <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="datetime-local"
                                                value={toInputDateTime(banner.start_at)}
                                                onChange={(event) => updateBanner(banner.id, { start_at: event.target.value || null })}
                                                className={`${CONTROL_CLASS} pl-9`}
                                            />
                                        </div>
                                    </Field>
                                    <Field label="Fim da exibicao">
                                        <div className="relative">
                                            <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="datetime-local"
                                                value={toInputDateTime(banner.end_at)}
                                                onChange={(event) => updateBanner(banner.id, { end_at: event.target.value || null })}
                                                className={`${CONTROL_CLASS} pl-9`}
                                            />
                                        </div>
                                    </Field>
                                </div>

                                <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 md:flex-row md:items-center md:justify-between">
                                    <label className="flex items-center gap-2 text-sm text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={banner.active}
                                            onChange={(event) => updateBanner(banner.id, { active: event.target.checked })}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        Banner ativo
                                    </label>

                                    <div className="flex flex-wrap gap-2">
                                        {banner.link && (
                                            <a
                                                href={banner.link}
                                                target={banner.link.startsWith('http') ? '_blank' : undefined}
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:border-blue-300 hover:text-blue-700"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                Abrir link
                                            </a>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(banner.id)}
                                            className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Excluir
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSave(banner)}
                                            disabled={savingId === banner.id}
                                            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {savingId === banner.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                            Salvar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                ))}

                {banners.length === 0 && (
                    <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center text-gray-400">
                        <ImageIcon className="mx-auto mb-4 h-12 w-12 opacity-50" />
                        <p>Nenhum banner cadastrado.</p>
                        <p className="text-sm">Envie uma imagem para comecar.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
        </div>
    );
}

function SpecCard({ icon, title, description, note }: { icon: ReactNode; title: string; description: string; note: string }) {
    return (
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
            <div className="flex items-start gap-3">
                <div className="rounded-md bg-white p-2 text-blue-600 shadow-sm">{icon}</div>
                <div>
                    <p className="font-semibold text-gray-900">{title}</p>
                    <p className="mt-1 text-sm text-gray-600">{description}</p>
                    <p className="mt-1 text-xs text-blue-600">{note}</p>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase text-gray-500">{label}</span>
            {children}
        </label>
    );
}
