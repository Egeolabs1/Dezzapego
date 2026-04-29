import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import SEO from '../../components/SEO';

export default function ResetPassword() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [canReset, setCanReset] = useState(false);

    useEffect(() => {
        async function checkRecoverySession() {
            const { data } = await supabase.auth.getSession();
            setCanReset(Boolean(data.session));
            setCheckingSession(false);
        }

        checkRecoverySession();
    }, []);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 6) {
            toast.error('A senha precisa ter pelo menos 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('As senhas não coincidem.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            toast.success('Senha redefinida com sucesso. Faça login novamente.');
            await supabase.auth.signOut();
            navigate('/login');
        } catch (error: any) {
            toast.error(error.message || 'Erro ao redefinir a senha.');
        } finally {
            setLoading(false);
        }
    };

    if (checkingSession) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!canReset) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50 px-4">
                <SEO title="Redefinir senha" description="Defina uma nova senha para sua conta no Dezzapego" noIndex />
                <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md text-center">
                    <h1 className="text-2xl font-bold mb-3 text-gray-800">Link inválido ou expirado</h1>
                    <p className="text-gray-600 mb-6">
                        Solicite uma nova recuperação de senha na tela de login.
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex items-center justify-center w-full py-2 px-4 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Voltar para login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50 px-4">
            <SEO title="Redefinir senha" description="Defina uma nova senha para sua conta no Dezzapego" noIndex />
            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Definir nova senha</h1>

                <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                            Nova senha
                        </label>
                        <div className="relative">
                            <input
                                id="new-password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                            Confirmar nova senha
                        </label>
                        <div className="relative">
                            <input
                                id="confirm-password"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword((prev) => !prev)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                                aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Salvar nova senha
                    </button>
                </form>
            </div>
        </div>
    );
}
