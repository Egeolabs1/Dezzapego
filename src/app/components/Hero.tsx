import { TrendingUp, Shield, Clock } from 'lucide-react';

export function Hero() {
  return (
    <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 text-white">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl mb-4">
            Desapegue e Ganhe Dinheiro
          </h1>
          <p className="text-xl text-blue-50 mb-8">
            O maior site de desapego do Brasil. Venda o que não usa mais e encontre produtos incríveis com preços especiais.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="mb-2">Milhões de Usuários</h3>
              <p className="text-sm text-blue-50">
                Alcance em todo o Brasil
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="mb-2">Compra Segura</h3>
              <p className="text-sm text-blue-50">
                Proteção e verificação de vendedores
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="mb-2">Anúncios 24/7</h3>
              <p className="text-sm text-blue-50">
                Venda a qualquer hora do dia
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}