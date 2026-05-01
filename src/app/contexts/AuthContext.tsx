import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { flushProfileSignupAndAccess } from '../../lib/profileIpLog';
import { Profile } from '../../types';

const SUSPENDED_NOTICE_KEY = 'dezzapego_suspended_notice';

async function handleSuspendedProfile(reason: string | null) {
    const text = (reason?.trim() || 'Sua conta foi suspensa.').slice(0, 500);
    try {
        sessionStorage.setItem(SUSPENDED_NOTICE_KEY, text);
    } catch {
        /* ignore */
    }
    toast.error(text);
    await supabase.auth.signOut();
    window.location.href = '/conta-suspensa';
}

type AuthContextType = {
    user: User | null;
    session: Session | null;
    profile: Profile | null; // NEW
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>; // NEW
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null); // NEW
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                // PGRST116 is "Row not found" - maybe trigger didn't run yet or old user.
                // We can handle gracefully.
                console.error('Error fetching profile:', error);
            }
            if (data) {
                if (data.is_suspended === true) {
                    await handleSuspendedProfile(
                        typeof data.suspended_reason === 'string' ? data.suspended_reason : null,
                    );
                    return;
                }
                setProfile(data);
                void flushProfileSignupAndAccess(data as Profile, userId);
            }
        } catch (err) {
            console.error('Profile fetch error:', err);
        }
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    };

    useEffect(() => {
        // Check active session on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id).finally(() => {
                    setLoading(false);
                });
            } else {
                setLoading(false);
            }
        });

        // Listen for changes on auth state (logged in, signed out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                // Determine if we need to fetch profile (e.g. if inconsistent with session)
                fetchProfile(session.user.id).finally(() => setLoading(false));
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
    };

    const value = {
        user,
        session,
        profile,
        loading,
        signOut,
        refreshProfile
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
