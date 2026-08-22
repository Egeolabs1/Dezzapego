import { useEffect, useState } from 'react';
import { AlertTriangle, Gauge, Megaphone, Save, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useMaintenance } from '../../contexts/MaintenanceContext';
import {
    DEFAULT_GLOBAL_ANNOUNCEMENT,
    type GlobalAnnouncementSettings,
    useGlobalAnnouncement,
} from '../../contexts/GlobalAnnouncementContext';
import { supabase } from '../../../lib/supabase';

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
    return (
        <label className="relative inline-flex shrink-0 cursor-pointer items-center" title={label}>
            <input type="checkbox" className="sr-only peer" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-label={label} />
            <div className="h-6 w-11 rounded-full bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all" />
        </label>
    );
}

export default function AdminSettings() {
    const { isMaintenanceMode, setMaintenanceMode } = useMaintenance();
    const { announcement, saveAnnouncement } = useGlobalAnnouncement();
    const [localMaintenance, setLocalMaintenance] = useState(isMaintenanceMode);
    const [requireAdApproval, setRequireAdApproval] = useState(true);
    const [globalAnnouncement, setGlobalAnnouncement] = useState<GlobalAnnouncementSettings>(DEFAULT_GLOBAL_ANNOUNCEMENT);
    const [announcementDirty, setAnnouncementDirty] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => setLocalMaintenance(isMaintenanceMode), [isMaintenanceMode]);
    useEffect(() => {
        if (!announcementDirty) setGlobalAnnouncement(announcement);
    }, [announcement, announcementDirty]);

    useEffect(() => {
        let cancelled = false;
        async function fetchAdModerationSetting() {
            const { data, error } = await supabase.from('system_settings').select('value').eq('key', 'require_ad_approval').maybeSingle();
            if (!cancelled && !error) setRequireAdApproval(data?.value !== false);
        }
        void fetchAdModerationSetting();
        return () => { cancelled = true; };
    }, []);

    const updateAnnouncement = (updates: Partial<GlobalAnnouncementSettings>) => {
        setAnnouncementDirty(true);
        setGlobalAnnouncement((current) => ({ ...current, ...updates }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (globalAnnouncement.enabled && !globalAnnouncement.message.trim()) {
                throw new Error('Informe a mensagem antes de ativar o aviso global.');
            }
            const { error } = await supabase.from('system_settings').upsert({
                key: 'require_ad_approval', value: requireAdApproval, updated_at: new Date().toISOString(),
            }, { onConflict: 'key' });
            if (error) throw error;

            await Promise.all([
                setMaintenanceMode(localMaintenance),
                saveAnnouncement({ ...globalAnnouncement, message: globalAnnouncement.message.trim() }),
            ]);
            setAnnouncementDirty(false);
            toast.success('Configurações salvas com sucesso.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao salvar as configurações.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Configurações da Plataforma</h1>
            <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <section>
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800"><Shield className="h-5 w-5 text-gray-500" /> Segurança e Acesso</h2>
                    <div className="mt-4 flex items-center justify-between gap-6 rounded-lg border border-gray-100 bg-gray-50 p-4">
                        <div><span className="block font-medium text-gray-900">Modo manutenção</span><span className="text-sm text-gray-500">Bloqueia o site para todos os usuários que não são administradores.</span></div>
                        <Toggle checked={localMaintenance} onChange={setLocalMaintenance} label="Ativar modo manutenção" />
                    </div>
                </section>

                <section className="border-t border-gray-100 pt-6">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800"><Shield className="h-5 w-5 text-gray-500" /> Moderação de Anúncios</h2>
                    <div className="mt-4 flex items-center justify-between gap-6 rounded-lg border border-gray-100 bg-gray-50 p-4">
                        <div><span className="block font-medium text-gray-900">Exigir aprovação antes de publicar</span><span className="text-sm text-gray-500">{requireAdApproval ? 'Novos anúncios ficam em análise até aprovação do admin.' : 'Novos anúncios entram ativos imediatamente.'}</span></div>
                        <Toggle checked={requireAdApproval} onChange={setRequireAdApproval} label="Exigir aprovação de anúncios" />
                    </div>
                </section>

                <section className="border-t border-gray-100 pt-6">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800"><Megaphone className="h-5 w-5 text-gray-500" /> Aviso Global</h2>
                    <div className="mt-4 space-y-4">
                        <div className="flex items-center justify-between gap-6 rounded-lg border border-gray-100 bg-gray-50 p-4">
                            <div><span className="block font-medium text-gray-900">Exibir aviso no site</span><span className="text-sm text-gray-500">Mostra o banner no topo de todas as páginas.</span></div>
                            <Toggle checked={globalAnnouncement.enabled} onChange={(enabled) => updateAnnouncement({ enabled })} label="Exibir aviso global" />
                        </div>
                        <div>
                            <label htmlFor="global-announcement-message" className="mb-2 block text-sm font-medium text-gray-700">Mensagem</label>
                            <input id="global-announcement-message" type="text" maxLength={300} className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex.: Frete grátis para anúncios publicados até domingo." value={globalAnnouncement.message} onChange={(event) => updateAnnouncement({ message: event.target.value })} />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4"><div className="flex items-center justify-between gap-4"><div><span className="block font-medium text-gray-900">Mensagem em movimento</span><span className="text-sm text-gray-500">Desliza continuamente pela tela.</span></div><Toggle checked={globalAnnouncement.scroll} onChange={(scroll) => updateAnnouncement({ scroll })} label="Ativar mensagem em movimento" /></div></div>
                            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4"><label htmlFor="announcement-speed" className="flex items-center gap-2 font-medium text-gray-900"><Gauge className="h-4 w-4" /> Velocidade: {globalAnnouncement.speed}s</label><input id="announcement-speed" type="range" min="8" max="60" step="1" disabled={!globalAnnouncement.scroll} className="mt-3 w-full accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50" value={globalAnnouncement.speed} onChange={(event) => updateAnnouncement({ speed: Number(event.target.value) })} /><p className="mt-1 text-xs text-gray-500">Menos segundos: movimento mais rápido.</p></div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm font-medium text-gray-900">Cor de fundo<input type="color" className="mt-3 block h-10 w-full cursor-pointer rounded border border-gray-300 bg-white p-1" value={globalAnnouncement.backgroundColor} onChange={(event) => updateAnnouncement({ backgroundColor: event.target.value })} /></label>
                            <label className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm font-medium text-gray-900">Cor do texto<input type="color" className="mt-3 block h-10 w-full cursor-pointer rounded border border-gray-300 bg-white p-1" value={globalAnnouncement.textColor} onChange={(event) => updateAnnouncement({ textColor: event.target.value })} /></label>
                        </div>
                        <div className="overflow-hidden rounded-lg" style={{ backgroundColor: globalAnnouncement.backgroundColor, color: globalAnnouncement.textColor }}><div className="flex min-h-10 items-center justify-center gap-2 px-4 py-2 text-sm font-medium"><AlertTriangle className="h-4 w-4 shrink-0" /><span>{globalAnnouncement.message.trim() || 'Prévia do aviso global'}</span></div></div>
                    </div>
                </section>

                <div className="flex justify-end border-t border-gray-100 pt-6"><button type="button" onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar alterações'}</button></div>
            </div>
        </div>
    );
}
