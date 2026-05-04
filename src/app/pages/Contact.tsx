import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Header } from '../components/Header';

import SEO from '../../components/SEO';
import { Mail, Send, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { loadTurnstile } from '../../lib/turnstile';
import { PUBLIC_ENV } from '../../lib/publicEnv';

export default function Contact() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState(user?.user_metadata?.full_name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const turnstileContainerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    const renderTurnstile = useCallback(() => {
        if (!window.turnstile || !turnstileContainerRef.current) return;
        if (widgetIdRef.current !== null) return;

        widgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
            sitekey: PUBLIC_ENV.TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
            callback: (token: string) => setTurnstileToken(token),
            'error-callback': () => setTurnstileToken(null),
        });
    }, []);

    useEffect(() => {
        let cancelled = false;

        loadTurnstile()
            .then(() => {
                if (!cancelled) renderTurnstile();
            })
            .catch(() => {
                if (!cancelled) toast.error('Não foi possível carregar a verificação de segurança.');
            });

        return () => {
            cancelled = true;
            if (window.turnstile && widgetIdRef.current !== null) {
                window.turnstile.remove(widgetIdRef.current);
                widgetIdRef.current = null;
            }
        };
    }, [renderTurnstile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !email || !subject || !message) {
            toast.error('Por favor, preencha todos os campos.');
            return;
        }

        if (!turnstileToken) {
            toast.error('Por favor, complete a verificação de segurança.');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase
                .from('contacts')
                .insert({
                    name,
                    email,
                    subject,
                    message,
                    user_id: user?.id || null
                });

            if (error) throw error;

            toast.success('Mensagem enviada com sucesso! Responderemos em breve.');
            // Reset form (keep name/email if logged in)
            if (!user) {
                setName('');
                setEmail('');
            }
            setSubject('');
            setMessage('');
            setTurnstileToken(null);
            if (window.turnstile && widgetIdRef.current !== null) {
                window.turnstile.reset(widgetIdRef.current);
            }

        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Erro ao enviar mensagem. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <SEO
                title="Fale Conosco"
                description="Entre em contato com a equipe do Dezzapego. Tire suas dúvidas, envie sugestões ou reporte problemas."
            />
            <Header />

            <div className="flex-1 container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">Fale Conosco</h1>
                        <p className="text-gray-600 text-lg">
                            Dúvidas, sugestões ou problemas? Estamos aqui para ajudar.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Contact Info */}
                        <div className="md:col-span-1 space-y-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                                        <Mail className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Atendimento</h3>
                                        <p className="text-gray-600 text-sm">Envie sua mensagem ao lado</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-green-50 rounded-lg text-green-600">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Localização</h3>
                                        <p className="text-gray-600 text-sm">São Paulo - SP</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="md:col-span-2">
                            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="space-y-2">
                                        <label htmlFor="name" className="text-sm font-medium text-gray-700">Seu Nome *</label>

                                        <input
                                            id="name"
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            placeholder="João Silva"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="email" className="text-sm font-medium text-gray-700">Seu Email *</label>

                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            placeholder="joao@exemplo.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 mb-6">
                                    <label htmlFor="subject" className="text-sm font-medium text-gray-700">Assunto *</label>

                                    <select
                                        id="subject"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        required
                                    >
                                        <option value="" disabled>Selecione um assunto</option>
                                        <option value="duvida">Dúvida sobre a plataforma</option>
                                        <option value="pagamento">Problemas com Anúncios</option>
                                        <option value="sugestao">Sugestão de melhoria</option>
                                        <option value="denuncia">Denúncia de usuário/anúncio</option>
                                        <option value="parceria">Parcerias e Publicidade</option>
                                        <option value="outro">Outro assunto</option>
                                    </select>
                                </div>

                                <div className="space-y-2 mb-8">
                                    <label htmlFor="message" className="text-sm font-medium text-gray-700">Mensagem *</label>

                                    <textarea
                                        id="message"
                                        rows={6}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                                        placeholder="Descreva sua dúvida ou problema..."
                                        required
                                    />
                                </div>

                                <div className="mb-6 flex justify-center">
                                    <div ref={turnstileContainerRef} />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            Enviar Mensagem
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
}
