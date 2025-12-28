import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

export function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if already installed (standalone mode)
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone ||
            document.referrer.includes('android-app://');

        setIsStandalone(isStandaloneMode);

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        // Capture install prompt event (Android/Desktop)
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Only show if not already installed
            if (!isStandaloneMode) {
                setShowInstallBanner(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Show banner for iOS if not installed
        if (isIosDevice && !isStandaloneMode) {
            // Check using local storage if user dismissed it recently to avoid annoyance
            const dismissed = localStorage.getItem('pwa_ios_dismissed');
            if (!dismissed) {
                setShowInstallBanner(true);
            }
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                setShowInstallBanner(false);
            }
        }
    };

    const handleDismiss = () => {
        setShowInstallBanner(false);
        if (isIOS) {
            localStorage.setItem('pwa_ios_dismissed', 'true');
        }
    };

    if (isStandalone || !showInstallBanner) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-500">
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex flex-col gap-4">

                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm">
                            D
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Instalar Dezzapego</h3>
                            <p className="text-sm text-gray-500">Experiência completa e mais rápida</p>
                        </div>
                    </div>
                    <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 p-1" title="Dispensar">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {isIOS ? (
                    <div className="bg-blue-50 p-3 rounded-xl text-sm text-blue-800">
                        <p className="flex items-center gap-2 mb-1 font-semibold">
                            <Share className="w-4 h-4" /> Para instalar no iPhone:
                        </p>
                        <ol className="list-decimal list-inside space-y-1 ml-1 text-blue-700">
                            <li>Toque no botão <b>Compartilhar</b> abaixo (na barra do navegador)</li>
                            <li>Role para baixo e toque em <b>Adicionar à Tela de Início</b></li>
                        </ol>
                    </div>
                ) : (
                    <button
                        onClick={handleInstallClick}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-blue-200 shadow-lg"
                    >
                        <Download className="w-5 h-5" />
                        Instalar Aplicativo
                    </button>
                )}
            </div>
        </div>
    );
}
