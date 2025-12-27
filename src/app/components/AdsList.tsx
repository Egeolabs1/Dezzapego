import { Heart, MapPin, Clock, Eye, Star } from 'lucide-react';
import type { Ad } from '../App';
import { useMemo } from 'react';

type AdsListProps = {
  selectedCategory: string;
  selectedSubcategory: string;
  selectedTransactionType?: 'venda' | 'aluguel' | '';
  selectedState: string;
  selectedCity?: string;
  priceRange: [number, number];
  searchQuery: string;
  onAdClick: (ad: Ad) => void;
  favorites: Set<string>;
  onToggleFavorite: (adId: string) => void;
};

// Mock data
const mockAds: Ad[] = [
  {
    id: '1',
    title: 'iPhone 15 Pro Max 256GB Titânio',
    price: 7899,
    description: 'iPhone 15 Pro Max em perfeito estado, com caixa e todos os acessórios originais. Nota fiscal inclusa.',
    category: 'eletronicos',
    subcategory: 'celulares',
    location: { city: 'São Paulo', state: 'SP' },
    images: ['https://images.unsplash.com/photo-1676173646307-d050e097d181?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWFydHBob25lJTIwdGVjaG5vbG9neXxlbnwxfHx8fDE3NjYzMjY2OTJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'],
    seller: { name: 'Carlos Silva', phone: '(11) 98765-4321', memberSince: '2020' },
    publishedAt: '2024-12-20T10:00:00Z',
    featured: true,
    views: 1234,
  },
  {
    id: '2',
    title: 'Honda Civic Touring 2023 Turbo',
    price: 145000,
    description: 'Civic Touring 2023, único dono, revisões em concessionária, impecável.',
    category: 'veiculos',
    subcategory: 'carros',
    location: { city: 'Rio de Janeiro', state: 'RJ' },
    images: ['https://images.unsplash.com/photo-1758216383800-7023ee8ed42b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBjYXIlMjBzZWRhbnxlbnwxfHx8fDE3NjYyOTY1ODF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'],
    seller: { name: 'Maria Santos', phone: '(21) 99876-5432', memberSince: '2019' },
    publishedAt: '2024-12-21T14:30:00Z',
    featured: true,
    views: 2567,
  },
  {
    id: '3',
    title: 'Apartamento 2 Quartos - Copacabana',
    price: 850000,
    description: 'Apartamento reformado, 2 quartos, 1 suíte, vista mar, ótima localização.',
    category: 'imoveis',
    subcategory: 'apartamentos',
    transactionType: 'venda',
    location: { city: 'Rio de Janeiro', state: 'RJ' },
    images: ['https://images.unsplash.com/photo-1594873604892-b599f847e859?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhcGFydG1lbnQlMjBpbnRlcmlvcnxlbnwxfHx8fDE3NjYzNzgxMDF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'],
    seller: { name: 'João Pedro', phone: '(21) 97654-3210', memberSince: '2021' },
    publishedAt: '2024-12-19T09:15:00Z',
    featured: false,
    views: 892,
  },
  {
    id: '4',
    title: 'Notebook Dell Inspiron 15 - i7 16GB',
    price: 3200,
    description: 'Notebook Dell Inspiron 15, Intel Core i7, 16GB RAM, SSD 512GB, placa de vídeo dedicada.',
    category: 'eletronicos',
    subcategory: 'computadores',
    location: { city: 'Curitiba', state: 'PR' },
    images: ['https://images.unsplash.com/photo-1511385348-a52b4a160dc2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYXB0b3AlMjBjb21wdXRlcnxlbnwxfHx8fDE3NjYzMjA3MjZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'],
    seller: { name: 'Ana Paula', phone: '(41) 98765-1234', memberSince: '2022' },
    publishedAt: '2024-12-22T08:00:00Z',
    featured: false,
    views: 456,
  },
  {
    id: '5',
    title: 'Sofá Retrátil 3 Lugares Cinza',
    price: 1899,
    description: 'Sofá retrátil e reclinável, 3 lugares, cor cinza, tecido suede, pouco tempo de uso.',
    category: 'moveis',
    subcategory: 'sala',
    location: { city: 'Belo Horizonte', state: 'MG' },
    images: ['https://images.unsplash.com/photo-1763565909003-46e9dfb68a00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBzb2ZhJTIwZnVybml0dXJlfGVufDF8fHx8MTc2NjM0NDk3Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'],
    seller: { name: 'Roberto Lima', phone: '(31) 99123-4567', memberSince: '2023' },
    publishedAt: '2024-12-21T16:45:00Z',
    featured: false,
    views: 678,
  },
  {
    id: '6',
    title: 'Kawasaki Ninja 400 2022',
    price: 28000,
    description: 'Kawasaki Ninja 400, ano 2022, 8.000 km rodados, impecável, revisões em dia.',
    category: 'veiculos',
    subcategory: 'motos',
    location: { city: 'Brasília', state: 'DF' },
    images: ['https://images.unsplash.com/photo-1671834214096-6aa88bd6470d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3RvcmN5Y2xlJTIwYmlrZXxlbnwxfHx8fDE3NjYzNjc5MTd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'],
    seller: { name: 'Lucas Oliveira', phone: '(61) 98234-5678', memberSince: '2020' },
    publishedAt: '2024-12-20T11:30:00Z',
    featured: true,
    views: 1876,
  },
  {
    id: '7',
    title: 'Apartamento 3 Quartos para Aluguel - Ipanema',
    price: 4500,
    description: 'Apartamento mobiliado, 3 quartos, 2 banheiros, garagem, próximo ao metrô.',
    category: 'imoveis',
    subcategory: 'apartamentos',
    transactionType: 'aluguel',
    location: { city: 'Rio de Janeiro', state: 'RJ' },
    images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcGFydG1lbnQlMjBsaXZpbmclMjByb29tfGVufDF8fHx8MTc2NjQyNzYzM3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'],
    seller: { name: 'Imobiliária Prime', phone: '(21) 3456-7890', memberSince: '2018' },
    publishedAt: '2024-12-22T15:00:00Z',
    featured: true,
    views: 1543,
  },
  {
    id: '8',
    title: 'Casa 4 Quartos com Piscina - Venda',
    price: 1200000,
    description: 'Casa espaçosa, 4 quartos, 3 suítes, piscina, churrasqueira, área gourmet completa.',
    category: 'imoveis',
    subcategory: 'casas',
    transactionType: 'venda',
    location: { city: 'São Paulo', state: 'SP' },
    images: ['https://images.unsplash.com/photo-1613977257363-707ba9348227?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBob3VzZSUyMGV4dGVyaW9yfGVufDF8fHx8MTc2NjQyNzY4Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'],
    seller: { name: 'Fernanda Costa', phone: '(11) 94567-8901', memberSince: '2022' },
    publishedAt: '2024-12-21T10:30:00Z',
    featured: false,
    views: 967,
  },
  {
    id: '9',
    title: 'Kitnet Mobiliada para Aluguel - Centro',
    price: 1200,
    description: 'Kitnet mobiliada, ideal para estudantes, próxima a universidades e transporte público.',
    category: 'imoveis',
    subcategory: 'apartamentos',
    transactionType: 'aluguel',
    location: { city: 'Belo Horizonte', state: 'MG' },
    images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWFsbCUyMGFwYXJ0bWVudCUyMGludGVyaW9yfGVufDF8fHx8MTc2NjQyNzcyNHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'],
    seller: { name: 'Pedro Almeida', phone: '(31) 98765-4321', memberSince: '2021' },
    publishedAt: '2024-12-23T08:45:00Z',
    featured: false,
    views: 234,
  },
  {
    id: '10',
    title: 'Terreno 500m² - Condomínio Fechado',
    price: 250000,
    description: 'Terreno plano, 500m², condomínio fechado com segurança 24h, área de lazer completa.',
    category: 'imoveis',
    subcategory: 'terrenos',
    transactionType: 'venda',
    location: { city: 'Curitiba', state: 'PR' },
    images: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYW5kJTIwcHJvcGVydHl8ZW58MXx8fHwxNzY2NDI3NzY0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'],
    seller: { name: 'Construtora Silva', phone: '(41) 3234-5678', memberSince: '2019' },
    publishedAt: '2024-12-20T14:20:00Z',
    featured: false,
    views: 543,
  },
  {
    id: '11',
    title: 'Sala Comercial 45m² - Aluguel',
    price: 2800,
    description: 'Sala comercial, 45m², 2 banheiros, ar condicionado, estacionamento, ótima localização.',
    category: 'imoveis',
    subcategory: 'comercial',
    transactionType: 'aluguel',
    location: { city: 'Porto Alegre', state: 'RS' },
    images: ['https://images.unsplash.com/photo-1497366216548-37526070297c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvZmZpY2UlMjBzcGFjZXxlbnwxfHx8fDE3NjY0Mjc3OTZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'],
    seller: { name: 'Imobiliária Sul', phone: '(51) 3345-6789', memberSince: '2020' },
    publishedAt: '2024-12-22T11:00:00Z',
    featured: false,
    views: 412,
  },
];

export function AdsList({
  selectedCategory,
  selectedSubcategory,
  selectedTransactionType = '',
  selectedState,
  selectedCity = '',
  priceRange,
  searchQuery,
  onAdClick,
  favorites,
  onToggleFavorite,
}: AdsListProps) {
  const filteredAds = useMemo(() => {
    return mockAds.filter((ad) => {
      // Category filter
      if (selectedCategory && ad.category !== selectedCategory) return false;

      // Subcategory filter
      if (selectedSubcategory && ad.subcategory !== selectedSubcategory) return false;

      // Transaction type filter (for real estate)
      if (selectedTransactionType && ad.transactionType !== selectedTransactionType) return false;

      // State filter
      if (selectedState && ad.location.state !== selectedState) return false;

      // City filter
      if (selectedCity && ad.location.city.toLowerCase() !== selectedCity.toLowerCase()) return false;

      // Price filter
      if (ad.price < priceRange[0] || ad.price > priceRange[1]) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          ad.title.toLowerCase().includes(query) ||
          ad.description.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [selectedCategory, selectedSubcategory, selectedTransactionType, selectedState, selectedCity, priceRange, searchQuery]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) {
      return `Há ${diffHours}h`;
    } else if (diffDays < 7) {
      return `Há ${diffDays}d`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  // Sort: featured first, then by date
  const sortedAds = [...filteredAds].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl">
          {filteredAds.length} {filteredAds.length === 1 ? 'anúncio encontrado' : 'anúncios encontrados'}
        </h2>
        <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option>Mais recentes</option>
          <option>Menor preço</option>
          <option>Maior preço</option>
          <option>Mais vistos</option>
        </select>
      </div>

      {sortedAds.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 mb-2">Nenhum anúncio encontrado</p>
          <p className="text-sm text-gray-400">Tente ajustar seus filtros de busca</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedAds.map((ad) => (
            <div
              key={ad.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
            >
              <div className="relative" onClick={() => onAdClick(ad)}>
                <img
                  src={ad.images[0]}
                  alt={ad.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {ad.featured && (
                  <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    Destaque
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(ad.id);
                  }}
                  className="absolute top-2 right-2 w-9 h-9 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-md"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      favorites.has(ad.id)
                        ? 'fill-red-500 text-red-500'
                        : 'text-gray-600'
                    }`}
                  />
                </button>
              </div>

              <div className="p-4" onClick={() => onAdClick(ad)}>
                <h3 className="mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {ad.title}
                </h3>
                <p className="text-2xl text-blue-600 mb-3">{formatPrice(ad.price)}</p>

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span>{ad.location.city}, {ad.location.state}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(ad.publishedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{ad.views.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}