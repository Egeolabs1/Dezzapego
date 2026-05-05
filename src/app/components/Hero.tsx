import { useState, useEffect } from 'react';
import { TrendingUp, Shield, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

type Banner = {
  id: string;
  image_url: string;
  mobile_image_url?: string | null;
  title?: string | null;
  subtitle?: string | null;
  cta_label?: string | null;
  link?: string | null;
  alt_text?: string | null;
  placement?: string | null;
  active?: boolean | null;
  sort_order?: number | null;
  start_at?: string | null;
  end_at?: string | null;
};

const DEFAULT_TITLE = 'Desapegue e Ganhe Dinheiro';
const DEFAULT_SUBTITLE = 'O maior site de desapego do Brasil. Venda o que nao usa mais e encontre produtos incriveis com precos especiais.';

function isVisibleBanner(banner: Banner) {
  const now = Date.now();
  const startsAfterNow = banner.start_at ? new Date(banner.start_at).getTime() > now : false;
  const endedBeforeNow = banner.end_at ? new Date(banner.end_at).getTime() < now : false;
  return banner.active !== false && !startsAfterNow && !endedBeforeNow;
}

export function Hero() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchBanners() {
      try {
        const { data } = await supabase
          .from('banners')
          .select('*')
          .eq('active', true)
          .eq('placement', 'home_hero')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false });

        const visibleBanners = ((data || []) as Banner[]).filter(isVisibleBanner);
        if (visibleBanners.length > 0) {
          setBanners(visibleBanners);
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
  const hasBanner = banners.length > 0;
  const title = currentBanner?.title?.trim() || DEFAULT_TITLE;
  const subtitle = currentBanner?.subtitle?.trim() || DEFAULT_SUBTITLE;

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
      onClick={handleBannerClick}
    >
      {hasBanner && (
        <>
          <picture className="absolute inset-0">
            {currentBanner.mobile_image_url && (
              <source media="(max-width: 767px)" srcSet={currentBanner.mobile_image_url} />
            )}
            <img
              src={currentBanner.image_url}
              alt={currentBanner.alt_text || title}
              className="h-full w-full object-cover"
            />
          </picture>
          <div className="absolute inset-0 bg-black/50" />
        </>
      )}

      <div className="container mx-auto px-4 py-8 md:py-16 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl mb-4 font-bold drop-shadow-lg select-none">
            {title}
          </h1>
          <p className="text-base md:text-xl text-blue-50 mb-6 md:mb-8 drop-shadow-md select-none">
            {subtitle}
          </p>

          {currentBanner?.cta_label && currentBanner.link && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleBannerClick();
              }}
              className="mb-4 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg transition-colors hover:bg-blue-50 md:mb-0"
            >
              {currentBanner.cta_label}
            </button>
          )}

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
