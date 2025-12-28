import { ArrowLeft, Heart, Share2, Flag, MapPin, Clock, Eye, Phone, MessageCircle, User, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Ad } from '../../types';
import { useState } from 'react';

type AdDetailsProps = {
  ad: Ad;
  onBack: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
};

export function AdDetails({ ad, onBack, isFavorite, onToggleFavorite }: AdDetailsProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % ad.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + ad.images.length) % ad.images.length);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Images and Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={ad.images[currentImageIndex]}
                  alt={ad.title}
                  className="w-full h-full object-cover"
                />

                {ad.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                      aria-label="Imagem anterior"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                      aria-label="Próxima imagem"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-white text-sm">
                      {currentImageIndex + 1} / {ad.images.length}
                    </div>
                  </>
                )}
              </div>

              {ad.images.length > 1 && (
                <div className="p-4 flex gap-2 overflow-x-auto">
                  {ad.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${index === currentImageIndex
                        ? 'border-blue-600 scale-105'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <img
                        src={image}
                        alt={`${ad.title} - ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h1 className="text-3xl mb-4">{ad.title}</h1>

              <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-5 h-5" />
                  <span>{ad.location.city}, {ad.location.state}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-5 h-5" />
                  <span>{formatDate(ad.publishedAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Eye className="w-5 h-5" />
                  <span>{ad.views.toLocaleString('pt-BR')} visualizações</span>
                </div>
              </div>

              <div>
                <h2 className="text-xl mb-3">Descrição</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {ad.description}
                </p>
              </div>
            </div>

            {/* Additional Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl mb-4">Informações Adicionais</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Segurança</p>
                    <p>Vendedor Verificado</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Visualizações</p>
                    <p>{ad.views.toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Seller Info and Actions */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Price Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600 mb-2">Preço</p>
                <p className="text-4xl text-blue-600 mb-6">{formatPrice(ad.price)}</p>

                <div className="space-y-3">
                  <button
                    onClick={() => setShowContactModal(true)}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow flex items-center justify-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    Ver Telefone
                  </button>
                  <button className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Enviar Mensagem
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={onToggleFavorite}
                      className={`py-3 rounded-lg border-2 transition-colors flex items-center justify-center gap-2 ${isFavorite
                        ? 'border-red-500 bg-red-50 text-red-600'
                        : 'border-gray-300 hover:border-gray-400'
                        }`}
                    >
                      <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                      {isFavorite ? 'Favoritado' : 'Favoritar'}
                    </button>
                    <button className="py-3 border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-colors flex items-center justify-center gap-2">
                      <Share2 className="w-5 h-5" />
                      Compartilhar
                    </button>
                  </div>
                </div>
              </div>

              {/* Seller Info */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="mb-4">Informações do Vendedor</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p>{ad.seller.name}</p>
                    <p className="text-sm text-gray-600">Membro desde {ad.seller.memberSince}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                  <Shield className="w-4 h-4" />
                  <span>Perfil verificado</span>
                </div>
              </div>

              {/* Report */}
              <button className="w-full py-3 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors flex items-center justify-center gap-2 text-gray-700">
                <Flag className="w-5 h-5" />
                Denunciar anúncio
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl mb-4">Informações de Contato</h3>
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">Vendedor</p>
              <p className="mb-4">{ad.seller.name}</p>
              <p className="text-sm text-gray-600 mb-2">Telefone</p>
              <p className="text-2xl text-blue-600">{ad.seller.phone}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <Shield className="w-4 h-4 inline mr-1" />
                Dica: Evite enviar pagamentos antecipados. Prefira negociar pessoalmente.
              </p>
            </div>
            <button
              onClick={() => setShowContactModal(false)}
              className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
