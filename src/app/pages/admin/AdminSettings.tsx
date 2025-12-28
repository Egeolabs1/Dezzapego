import { useState, useEffect } from 'react';
import { Save, Shield, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useMaintenance } from '../../contexts/MaintenanceContext';

export default function AdminSettings() {
    const { isMaintenanceMode, setMaintenanceMode } = useMaintenance();
    // Local state to handle UI before saving? Or direct toggle?
    // Let's use local state initialized from context for smoother UX, asking for save
    const [localMaintenance, setLocalMaintenance] = useState(isMaintenanceMode);

    useEffect(() => {
        setLocalMaintenance(isMaintenanceMode);
    }, [isMaintenanceMode]);
    const [globalAlert, setGlobalAlert] = useState('');

    const handleSave = async () => {
        try {
            await setMaintenanceMode(localMaintenance);
            toast.success('Configurações salvas com sucesso!');
        } catch (error) {
            toast.error('Erro ao salvar. Verifique se a tabela system_settings existe.');
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Configurações da Plataforma</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-gray-500" />
                        Segurança e Acesso
                    </h3>
                    <div className="mt-4 flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div>
                            <span className="font-medium text-gray-900 block">Modo Manutenção</span>
                            <span className="text-sm text-gray-500">Impede o acesso de usuários não-admin ao site.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer" title="Ativar Modo Manutenção">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={localMaintenance}
                                onChange={e => setLocalMaintenance(e.target.checked)}
                                aria-label="Ativar Modo Manutenção"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-gray-500" />
                        Avisos Globais
                    </h3>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem do Banner</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: Estamos em manutenção programada..."
                            value={globalAlert}
                            onChange={e => setGlobalAlert(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-2">Esta mensagem aparecerá no topo de todas as páginas.</p>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-6 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Save className="w-4 h-4" />
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
}
