import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type MaintenanceContextType = {
    isMaintenanceMode: boolean;
    setMaintenanceMode: (enabled: boolean) => Promise<void>;
    loading: boolean;
};

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
    const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSettings();

        // Realtime subscription
        const channel = supabase
            .channel('system_settings')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'system_settings' },
                () => fetchSettings()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchSettings() {
        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'maintenance_mode')
                .single();

            if (error) throw error;
            if (data) {
                setIsMaintenanceMode(data.value === true); // Ensure boolean
            }
        } catch (error) {
            console.error('Error fetching maintenance settings:', error);
        } finally {
            setLoading(false);
        }
    }

    const setMaintenanceMode = async (enabled: boolean) => {
        try {
            // Upsert setting
            const { error } = await supabase
                .from('system_settings')
                .upsert({
                    key: 'maintenance_mode',
                    value: enabled,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (error) throw error;
            setIsMaintenanceMode(enabled);
        } catch (error) {
            console.error('Error updating maintenance mode:', error);
            throw error;
        }
    };

    const value = {
        isMaintenanceMode,
        setMaintenanceMode,
        loading
    };

    return <MaintenanceContext.Provider value={value}>{children}</MaintenanceContext.Provider>;
}

export const useMaintenance = () => {
    const context = useContext(MaintenanceContext);
    if (context === undefined) {
        throw new Error('useMaintenance must be used within a MaintenanceProvider');
    }
    return context;
};
