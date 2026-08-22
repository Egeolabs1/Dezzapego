import { Wrench } from 'lucide-react';
import Link from 'next/link';

export default function Maintenance() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="text-center max-w-lg mx-auto">
                <div className="bg-blue-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
                    <Wrench className="w-12 h-12 text-blue-600" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Estamos em Manutenção</h1>
                <p className="text-xl text-gray-600 mb-8">
                    O Dezzapego está passando por melhorias para te atender ainda melhor.
                    Voltaremos em breve!
                </p>
                <p className="text-sm text-gray-400 mt-4">
                    Acompanhe nossos canais oficiais para novidades.
                </p>
                <Link href="/login" className="mt-6 inline-flex text-sm font-medium text-blue-600 hover:text-blue-800">Acesso administrativo</Link>
            </div>
        </div>
    );
}
