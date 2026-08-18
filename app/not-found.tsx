import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50 px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black text-purple-600 mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Página não encontrada</h1>
        <p className="text-gray-500 mb-8">
          O endereço que você procura não existe ou foi removido. Tente voltar para a página inicial.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
