import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import SEO from '../../components/SEO';
import { consumeAuthNext, getSafeNextPath, rememberAuthNext } from '../../lib/authIntent';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextPath = getSafeNextPath(searchParams.get('next'), '/');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            toast.success('Login realizado com sucesso!');
            const destination = consumeAuthNext(nextPath);
            router.push(destination);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Erro ao realizar login.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            toast.error('Digite seu e-mail para recuperar a senha.');
            return;
        }

        setResetLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/redefinir-senha`,
            });

            if (error) throw error;
            setResetSent(true);
            toast.success('Link de recuperação enviado! Verifique sua caixa de entrada e também spam/promoções.');
        } catch (error: any) {
            toast.error(error.message || 'Erro ao solicitar recuperação de senha.');
        } finally {
            setResetLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/login?next=${encodeURIComponent(nextPath)}`,
                    queryParams: {
                        prompt: 'select_account',
                    },
                },
            });
            if (error) throw error;
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Erro ao entrar com Google.');
            setLoading(false);
        }
    };

    useEffect(() => {
        if (nextPath !== '/') rememberAuthNext(nextPath);
    }, [nextPath]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50 px-4">
            <SEO title="Entrar" description="Acesse sua conta no Dezzapego" noIndex />
            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Entrar no Dezzapego</h1>

                <Link
                    href={nextPath === '/' ? '/register' : `/register?next=${encodeURIComponent(nextPath)}`}
                    className="flex items-center justify-center gap-2 w-full mb-6 py-3 rounded-lg border-2 border-dashed border-blue-300 text-blue-600 font-semibold hover:bg-blue-50 hover:border-blue-400 transition-all text-sm"
                >
                    Novo por aqui? Crie sua conta
                </Link>

                <div className="relative py-1 mb-2">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="bg-white px-2 text-gray-500">ou entre com e-mail</span>
                    </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Senha</label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="********"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {resetSent ? (
                            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                Link enviado! Verifique seu e-mail (e pasta spam).
                            </p>
                        ) : (
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                disabled={resetLoading}
                                className="text-sm text-blue-600 hover:underline disabled:opacity-60"
                            >
                                {resetLoading ? 'Enviando...' : 'Esqueci minha senha'}
                            </button>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Entrar
                    </button>

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-gray-200 rounded-md text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-colors"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Entrar com Google
                    </button>
                </form>
            </div>
        </div>
    );
}
