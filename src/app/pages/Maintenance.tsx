import { Wrench } from 'lucide-react';

export default function Maintenance() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="text-center max-w-lg mx-auto">
                <div className="bg-blue-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                    <Wrench className="w-12 h-12 text-blue-600" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Estamos em Manutenção</h1>
                <p className="text-xl text-gray-600 mb-8">
                    O Dezzapego está passando por melhorias para te atender ainda melhor.
                    Voltaremos em breve!
                </p>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 w-1/3 animate-progress"></div>
                </div>
                <p className="text-sm text-gray-400 mt-4">
                    Equipe Dezzapego
                </p>
            </div>
        </div>
    );
}
