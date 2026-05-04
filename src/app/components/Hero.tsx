import { useState, useEffect } from 'react';
import { TrendingUp, Shield, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export function Hero() {
  const [banners, setBanners] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchBanners() {
      try {
        const { data } = await supabase
          .from('banners')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          setBanners(data);
        }
      } catch (e) {
        // Silent fail
      }
    }
    fetchBanners();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % banners.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);

  const currentBanner = banners[currentIndex];
  // Determine if we show default gradient OR the banner image
  const hasBanner = banners.length > 0;
  const bgStyle = hasBanner
    ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${currentBanner.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  const handleBannerClick = () => {
    if (currentBanner?.link) {
      if (currentBanner.link.startsWith('http')) {
        window.open(currentBanner.link, '_blank');
      } else {
        navigate(currentBanner.link);
      }
    }
  };

  return (
    <div
      className={`relative text-white transition-all duration-700 ease-in-out ${!hasBanner ? 'bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500' : 'bg-gray-900'} ${currentBanner?.link ? 'cursor-pointer hover:opacity-95' : ''}`}
      style={bgStyle} // Dynamic background image requires inline style
      onClick={handleBannerClick}
    >
      <div className="container mx-auto px-4 py-8 md:py-16 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl mb-4 font-bold drop-shadow-lg select-none">
            Desapegue e Ganhe Dinheiro
          </h1>
          <p className="text-base md:text-xl text-blue-50 mb-6 md:mb-8 drop-shadow-md select-none">
            O maior site de desapego do Brasil. Venda o que não usa mais e encontre produtos incríveis com preços especiais.
          </p>

          <div className="hidden md:grid grid-cols-3 gap-6 mt-12">
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20 shadow-lg transition-transform hover:-translate-y-1">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="mb-2 font-semibold">Milhões de Usuários</h3>
              <p className="text-sm text-blue-50">
                Alcance em todo o Brasil
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20 shadow-lg transition-transform hover:-translate-y-1">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="mb-2 font-semibold">Compra Segura</h3>
              <p className="text-sm text-blue-50">
                Proteção e verificação de vendedores
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20 shadow-lg transition-transform hover:-translate-y-1">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="mb-2 font-semibold">Anúncios 24/7</h3>
              <p className="text-sm text-blue-50">
                Venda a qualquer hora do dia
              </p>
            </div>
          </div>
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prevSlide(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white backdrop-blur-sm transition-colors z-20"
            aria-label="Banner anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white backdrop-blur-sm transition-colors z-20"
            aria-label="Próximo banner"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-4' : 'bg-white/50'}`}
                aria-label={`Ir para banner ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
