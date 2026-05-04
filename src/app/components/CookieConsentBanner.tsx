import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    CONSENT_POLICY_VERSION,
    getConsent,
    hasConsentRecorded,
    OPEN_CONSENT_EVENT,
    setConsent,
} from '../../lib/privacyConsent';

/**
 * Banner LGPD: cookies essenciais + opcionalmente medição de uso (site_visits).
 * Preferências em localStorage; reabrir via Footer ou evento OPEN_CONSENT_EVENT.
 */
export function CookieConsentBanner() {
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [settingsMode, setSettingsMode] = useState(false);
    const [analyticsToggle, setAnalyticsToggle] = useState(false);
    const [adsToggle, setAdsToggle] = useState(false);

    useEffect(() => {
        const initialConsent = getConsent();
        setAnalyticsToggle(initialConsent?.analytics ?? false);
        setAdsToggle(initialConsent?.adsPersonalization ?? false);
        setOpen(!hasConsentRecorded());

        const onOpen = () => {
            const current = getConsent();
            setSettingsMode(true);
            setAnalyticsToggle(current?.analytics ?? false);
            setAdsToggle(current?.adsPersonalization ?? false);
            setOpen(true);
        };
        window.addEventListener(OPEN_CONSENT_EVENT, onOpen);
        return () => window.removeEventListener(OPEN_CONSENT_EVENT, onOpen);
    }, []);

    if (location.pathname.startsWith('/admin')) return null;
    if (!open) return null;

    const acceptEssentials = () => {
        setConsent({ analytics: false, adsPersonalization: false });
        setSettingsMode(false);
        setOpen(false);
    };

    const acceptAll = () => {
        setConsent({ analytics: true, adsPersonalization: true });
        setSettingsMode(false);
        setOpen(false);
    };

    const savePreferences = () => {
        setConsent({ analytics: analyticsToggle, adsPersonalization: adsToggle });
        setSettingsMode(false);
        setOpen(false);
    };

    return (
        <div
            className="fixed inset-x-0 bottom-0 z-[100] border-t border-gray-200 bg-white/95 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm md:bottom-0 md:pb-[env(safe-area-inset-bottom)]"
            role="dialog"
            aria-label="Preferências de privacidade e cookies"
        >
            <div className="container mx-auto max-w-4xl px-4 py-4 md:py-5">
                <p className="text-sm font-semibold text-gray-900">
                    {settingsMode ? 'Gerenciar cookies e medição de uso' : 'Privacidade e cookies'}
                </p>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                    Usamos cookies e armazenamento local estritamente necessários para o funcionamento do site (sessão,
                    preferências). Com seu consentimento, também registramos páginas visitadas de forma agregada e
                    podemos exibir publicidade personalizada do Google. Consulte a{' '}
                    <Link to="/privacidade" className="text-blue-600 underline hover:text-blue-800">
                        Política de Privacidade
                    </Link>{' '}
                    (versão {CONSENT_POLICY_VERSION}).
                </p>

                {settingsMode && (
                    <div className="mt-4 space-y-3">
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                            <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={analyticsToggle}
                                onChange={(e) => setAnalyticsToggle(e.target.checked)}
                            />
                            <span className="text-sm text-gray-700">
                                <strong>Estatísticas de uso</strong> — envio anônimo de rotas visitadas para análise interna.
                            </span>
                        </label>
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                            <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={adsToggle}
                                onChange={(e) => setAdsToggle(e.target.checked)}
                            />
                            <span className="text-sm text-gray-700">
                                <strong>Publicidade personalizada</strong> — permite que parceiros como o Google usem
                                sinais de consentimento para anúncios mais relevantes. Sem isso, poderemos exibir
                                anúncios limitados ou não personalizados.
                            </span>
                        </label>
                    </div>
                )}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    {!settingsMode ? (
                        <>
                            <button
                                type="button"
                                onClick={acceptEssentials}
                                className="order-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 sm:order-1"
                            >
                                Apenas essenciais
                            </button>
                            <button
                                type="button"
                                onClick={acceptAll}
                                className="order-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 sm:order-2"
                            >
                                Aceitar todos
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const current = getConsent();
                                    setSettingsMode(true);
                                    setAnalyticsToggle(current?.analytics ?? false);
                                    setAdsToggle(current?.adsPersonalization ?? false);
                                }}
                                className="order-3 text-sm text-blue-600 underline hover:text-blue-800 sm:order-3"
                            >
                                Personalizar
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    setSettingsMode(false);
                                    if (hasConsentRecorded()) setOpen(false);
                                }}
                                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={savePreferences}
                                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                            >
                                Salvar preferências
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
