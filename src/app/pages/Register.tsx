import { useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import SEO from '../../components/SEO';
import { FieldError } from '../components/FieldError';
import { recordSignupIpAndFirstAccess } from '../../lib/profileIpLog';
import { digitsOnly, formatCpfCnpj, formatPhone, isValidCpfOrCnpj } from '../../lib/marketplaceQuality';

type AccountType = 'personal' | 'professional';

const PHONE_DIGITS_MIN = 10;

function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function passwordChecks(password: string) {
    return {
        length: password.length >= 8,
        upper: /[A-ZÀ-Ü]/.test(password),
        lower: /[a-zà-ü]/.test(password),
        digit: /\d/.test(password),
    };
}

function passwordMeetsPolicy(password: string) {
    const c = passwordChecks(password);
    return c.length && c.upper && c.lower && c.digit;
}

export default function Register() {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [accountType, setAccountType] = useState<AccountType>('personal');
    const [responsibleName, setResponsibleName] = useState('');
    const [document, setDocument] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [touched, setTouched] = useState(false);

    const navigate = useNavigate();

    const errors = useMemo(() => {
        const e: Record<string, string> = {};
        const n = name.trim();
        if (touched || n) {
            if (n.length < 2) e.name = accountType === 'professional' ? 'Informe o nome da loja ou negócio.' : 'Informe um nome válido (mínimo 2 caracteres).';
        }
        const responsible = responsibleName.trim();
        if (accountType === 'professional' && (touched || responsible)) {
            if (responsible.length < 2) e.responsibleName = 'Informe o nome do responsável pela conta.';
        }
        const ph = digitsOnly(phone);
        if (touched || phone) {
            if (ph.length < PHONE_DIGITS_MIN) e.phone = 'Informe um telefone com DDD (mínimo 10 dígitos).';
        }
        const em = email.trim();
        if (touched || em) {
            if (!isValidEmail(em)) e.email = 'Informe um e-mail válido.';
        }
        if (touched || password) {
            if (!passwordMeetsPolicy(password)) {
                e.password = 'A senha deve ter 8+ caracteres, com maiúscula, minúscula e número.';
            }
        }
        if (touched || confirmPassword) {
            if (password !== confirmPassword) e.confirmPassword = 'As senhas não coincidem.';
        }
        const doc = document.trim();
        if (touched || doc) {
            if (!isValidCpfOrCnpj(doc)) {
                e.document = 'Informe um CPF ou CNPJ válido.';
            }
        }
        if (touched && !termsAccepted) {
            e.terms = 'Aceite os termos para continuar.';
        }
        return e;
    }, [name, responsibleName, phone, email, password, confirmPassword, accountType, document, termsAccepted, touched]);

    const pwdStatus = passwordChecks(password);

    const validateAll = (): boolean => {
        setTouched(true);
        const e: string[] = [];
        if (name.trim().length < 2) e.push('nome');
        if (accountType === 'professional' && responsibleName.trim().length < 2) e.push('responsável');
        if (digitsOnly(phone).length < PHONE_DIGITS_MIN) e.push('telefone');
        if (!isValidEmail(email)) e.push('email');
        if (!passwordMeetsPolicy(password)) e.push('senha');
        if (password !== confirmPassword) e.push('confirmação');
        if (!termsAccepted) e.push('termos');
        if (!isValidCpfOrCnpj(document)) e.push('cpf/cnpj');
        if (e.length) {
            toast.error('Corrija os campos destacados antes de continuar.');
            return false;
        }
        return true;
    };

    const handleRegister = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!validateAll()) return;

        setLoading(true);
        try {
            const meta: Record<string, string> = {
                full_name: name.trim(),
                phone: digitsOnly(phone),
                cpf_cnpj: digitsOnly(document),
                account_type: accountType,
            };
            if (accountType === 'professional') {
                meta.business_name = name.trim();
                meta.responsible_name = responsibleName.trim();
            }

            const normalizedPhone = digitsOnly(phone);
            const normalizedDocument = digitsOnly(document);
            const { data: duplicatedProfile, error: duplicatedProfileError } = await supabase.rpc('profile_identity_exists', {
                p_phone: normalizedPhone,
                p_cpf_cnpj: normalizedDocument,
            });

            if (duplicatedProfileError) throw duplicatedProfileError;
            if (duplicatedProfile) {
                toast.error('Já existe uma conta usando este CPF/CNPJ ou telefone. Tente entrar ou recupere a senha.');
                return;
            }

            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: { data: meta },
            });

            if (error) throw error;

            if (data.user && !data.session) {
                toast.success('Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.');
                navigate('/login', { replace: true });
                return;
            }

            if (data.session && data.user?.id) {
                await recordSignupIpAndFirstAccess({ userId: data.user.id });
            }

            toast.success('Cadastro realizado! Se necessário, confirme o e-mail para ativar totalmente sua conta.');
            navigate('/anunciar', { replace: true });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao realizar cadastro.';
            if (/already registered|already exists|duplicate|23505/i.test(msg)) {
                toast.error('Já existe uma conta com estes dados. Tente entrar ou use a recuperação de senha.');
            } else {
                toast.error(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        if (!termsAccepted) {
            setTouched(true);
            toast.error('Aceite os termos para continuar com Google.');
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/anunciar`,
                    queryParams: {
                        prompt: 'select_account',
                    },
                },
            });
            if (error) throw error;
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Não foi possível iniciar cadastro com Google.');
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50 px-4 py-10">
            <SEO title="Criar Conta" description="Crie sua conta no Dezzapego e comece a vender ou comprar" noIndex />
            <div className="w-full max-w-lg bg-white p-8 rounded-xl shadow-md border border-gray-100">
                <h1 className="text-2xl font-bold mb-1 text-center text-gray-800">Crie sua conta</h1>
                <p className="text-center text-sm text-gray-500 mb-6">Preencha com atenção para proteger sua conta e facilitar contatos.</p>
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                    Após criar sua conta, enviaremos um <strong>e-mail de confirmação</strong>. Você precisa confirmar o e-mail para concluir o cadastro e entrar.
                </div>

                <form onSubmit={handleRegister} className="space-y-4" noValidate>
                    <div className="flex gap-2 p-1 bg-gray-100 rounded-lg mb-2">
                        <button
                            type="button"
                            onClick={() => setAccountType('personal')}
                            className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
                                accountType === 'personal' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            Pessoa física
                        </button>
                        <button
                            type="button"
                            onClick={() => setAccountType('professional')}
                            className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
                                accountType === 'professional' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            Profissional / Loja
                        </button>
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            {accountType === 'professional' ? 'Nome da empresa ou negócio' : 'Nome completo'}
                        </label>
                        <input
                            id="name"
                            type="text"
                            autoComplete="name"
                            placeholder={accountType === 'professional' ? 'Ex: Imobiliária Silva' : 'Seu nome'}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={() => setTouched(true)}
                            className={`flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.name ? 'border-red-400' : 'border-gray-300'
                            }`}
                        />
                        <FieldError message={errors.name} />
                    </div>

                    {accountType === 'professional' && (
                        <div className="space-y-1">
                            <label htmlFor="responsibleName" className="block text-sm font-medium text-gray-700">
                                Nome do responsável
                            </label>
                            <input
                                id="responsibleName"
                                type="text"
                                autoComplete="name"
                                placeholder="Nome de quem administra a conta"
                                value={responsibleName}
                                onChange={(e) => setResponsibleName(e.target.value)}
                                onBlur={() => setTouched(true)}
                                className={`flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.responsibleName ? 'border-red-400' : 'border-gray-300'
                                }`}
                            />
                            <FieldError message={errors.responsibleName} />
                        </div>
                    )}

                    <div className="space-y-1">
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                            Telefone / WhatsApp
                        </label>
                        <input
                            id="phone"
                            type="tel"
                            autoComplete="tel"
                            placeholder="(00) 00000-0000"
                            value={phone}
                            onChange={(e) => setPhone(formatPhone(e.target.value))}
                            onBlur={() => setTouched(true)}
                            className={`flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.phone ? 'border-red-400' : 'border-gray-300'
                            }`}
                        />
                        <FieldError message={errors.phone} />
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="document" className="block text-sm font-medium text-gray-700">
                            CPF ou CNPJ
                        </label>
                        <input
                            id="document"
                            type="text"
                            inputMode="numeric"
                            placeholder="Somente números"
                            value={document}
                            onChange={(e) => setDocument(formatCpfCnpj(e.target.value))}
                            onBlur={() => setTouched(true)}
                            className={`flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.document ? 'border-red-400' : 'border-gray-300'
                            }`}
                        />
                        <FieldError message={errors.document} />
                        <p className="text-xs text-gray-500">Usamos para segurança da conta e prevenção de duplicidade.</p>
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            E-mail
                        </label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={() => setTouched(true)}
                            className={`flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.email ? 'border-red-400' : 'border-gray-300'
                            }`}
                        />
                        <FieldError message={errors.email} />
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Senha
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                placeholder="Mínimo 8 caracteres"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onBlur={() => setTouched(true)}
                                className={`flex h-10 w-full rounded-md border bg-white px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.password ? 'border-red-400' : 'border-gray-300'
                                }`}
                            />
                            <button
                                type="button"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 p-1"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <FieldError message={errors.password} />
                        <ul className="text-xs text-gray-600 space-y-0.5 mt-1">
                            <li className={pwdStatus.length ? 'text-green-600' : ''}>• Pelo menos 8 caracteres</li>
                            <li className={pwdStatus.upper ? 'text-green-600' : ''}>• Uma letra maiúscula</li>
                            <li className={pwdStatus.lower ? 'text-green-600' : ''}>• Uma letra minúscula</li>
                            <li className={pwdStatus.digit ? 'text-green-600' : ''}>• Um número</li>
                        </ul>
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                            Confirmar senha
                        </label>
                        <div className="relative">
                            <input
                                id="confirmPassword"
                                type={showConfirm ? 'text' : 'password'}
                                autoComplete="new-password"
                                placeholder="Repita a senha"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                onBlur={() => setTouched(true)}
                                className={`flex h-10 w-full rounded-md border bg-white px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.confirmPassword ? 'border-red-400' : 'border-gray-300'
                                }`}
                            />
                            <button
                                type="button"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 p-1"
                                onClick={() => setShowConfirm((v) => !v)}
                                aria-label={showConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                            >
                                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <FieldError message={errors.confirmPassword} />
                    </div>

                    <div className="flex items-start gap-3 pt-2">
                        <div className="flex items-center h-5">
                            <input
                                id="terms"
                                name="terms"
                                type="checkbox"
                                checked={termsAccepted}
                                onChange={(e) => {
                                    setTermsAccepted(e.target.checked);
                                    setTouched(true);
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                        </div>
                        <div className="text-sm">
                            <label htmlFor="terms" className="font-medium text-gray-700">
                                Li e concordo com os{' '}
                                <Link to="/termos" target="_blank" className="text-blue-600 hover:underline">
                                    Termos de Uso
                                </Link>{' '}
                                e{' '}
                                <Link to="/privacidade" target="_blank" className="text-blue-600 hover:underline">
                                    Política de Privacidade
                                </Link>
                                .
                            </label>
                            <FieldError message={errors.terms} />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {accountType === 'professional' ? 'Criar conta profissional' : 'Criar conta'}
                    </button>

                    <div className="relative py-1">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-white px-2 text-gray-500">ou</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleSignup}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        <span className="font-bold text-blue-600">G</span>
                        Continuar com Google
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-600">
                    Já tem uma conta?{' '}
                    <Link to="/login" className="text-blue-600 hover:underline font-medium">
                        Entrar
                    </Link>
                </div>
            </div>
        </div>
    );
}
