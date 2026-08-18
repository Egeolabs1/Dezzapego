import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const requestIdRef = useRef(0);

    const fetchProfile = async (userId: string) => {
        const currentRequestId = ++requestIdRef.current;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, phone, email, city, state, bio, website, instagram, cpf_cnpj, account_type, business_name, rating, verified, verification_status, verification_docs, is_suspended, suspended_reason, role, created_at, signup_ip')
                .eq('id', userId)
                .maybeSingle();

            // Stale response - discard
            if (currentRequestId !== requestIdRef.current) return;

            if (error && error.code !== 'PGRST116') {
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
            if (currentRequestId !== requestIdRef.current) return;
            console.error('Profile fetch error:', err);
        }
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    };

    useEffect(() => {
        let isMounted = true;

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!isMounted) return;
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id).finally(() => {
                    if (isMounted) setLoading(false);
                });
            } else {
                setLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!isMounted) return;
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id).finally(() => {
                    if (isMounted) setLoading(false);
                });
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
    };

    const value = useMemo(() => ({
        user,
        session,
        profile,
        loading,
        signOut,
        refreshProfile,
    }), [user, session, profile, loading]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
