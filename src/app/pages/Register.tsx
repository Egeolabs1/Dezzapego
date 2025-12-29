import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import SEO from '../../components/SEO';

export default function Register() {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [accountType, setAccountType] = useState<'personal' | 'professional'>('personal');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        phone: phone,
                        account_type: accountType,
                    },
                },
            });

            if (error) throw error;

            toast.success('Cadastro realizado com sucesso! Verifique seu email se necessário.');
            navigate('/');
        } catch (error: any) {
            toast.error(error.message || 'Erro ao realizar cadastro.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50 px-4">
            <SEO title="Criar Conta" description="Crie sua conta no Dezzapego e comece a vender ou comprar" />
            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Crie sua conta</h1>

                <form onSubmit={handleRegister} className="space-y-4">
                    {/* Account Type Selection */}
                    <div className="flex gap-4 p-1 bg-gray-100 rounded-lg mb-6">
                        <button
                            type="button"
                            onClick={() => setAccountType('personal')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${accountType === 'personal'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            Pessoa Física
                        </button>
                        <button
                            type="button"
                            onClick={() => setAccountType('professional')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${accountType === 'professional'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            Profissional / Loja
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            {accountType === 'professional' ? 'Nome da Empresa / Negócio' : 'Nome Completo'}
                        </label>
                        <input
                            id="name"
                            type="text"
                            placeholder={accountType === 'professional' ? "Ex: Imobiliária Silva" : "Seu nome"}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Telefone / WhatsApp</label>
                        <input
                            id="phone"
                            type="tel"
                            placeholder="(00) 00000-0000"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            {accountType === 'professional' ? 'Email Comercial' : 'Email'}
                        </label>
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
                        <input
                            id="password"
                            type="password"
                            placeholder="********"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {accountType === 'professional' ? 'Criar Conta Profissional' : 'Criar Conta Pessoal'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-600">
                    Já tem uma conta?{' '}
                    <Link to="/login" className="text-blue-600 hover:underline">
                        Entrar
                    </Link>
                </div>
            </div>
        </div>
    );
}
