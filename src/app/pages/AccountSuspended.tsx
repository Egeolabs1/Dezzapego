import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { AlertTriangle } from 'lucide-react';

const STORAGE_KEY = 'dezzapego_suspended_notice';

/**
 * Página exibida após logout forçado por conta suspensa (motivo em sessionStorage).
 */
export default function AccountSuspended() {
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (raw) {
                setMessage(raw);
                sessionStorage.removeItem(STORAGE_KEY);
            } else {
                setMessage('Esta conta está suspensa. Entre em contato se precisar de esclarecimentos.');
            }
        } catch {
            setMessage('Esta conta está suspensa.');
        }
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            <Header hideLocationFilter />
            <div className="container mx-auto max-w-lg px-4 py-16">
                <div className="rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
                    <div className="flex items-center gap-3 text-amber-800 mb-4">
                        <AlertTriangle className="w-10 h-10 shrink-0" />
                        <h1 className="text-xl font-bold text-gray-900">Conta suspensa</h1>
                    </div>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{message}</p>
                    <p className="mt-6 text-sm text-gray-600">
                        Se acredita que houve um erro, fale com o suporte pela página de contato.
                    </p>
                    <Link
                        to="/contato"
                        className="mt-6 inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                        Ir para contato
                    </Link>
                    <p className="mt-8 text-center text-sm text-gray-500">
                        <Link to="/" className="text-blue-600 hover:underline">
                            Voltar à página inicial
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
