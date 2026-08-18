'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50 px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black text-red-500 mb-4">!</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Algo deu errado</h1>
        <p className="text-gray-500 mb-8">
          Ocorreu um erro inesperado. Tente recarregar a página ou volte para o início.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 border-2 border-purple-200 text-purple-700 font-semibold px-6 py-3 rounded-xl hover:bg-purple-50 transition-colors"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}
