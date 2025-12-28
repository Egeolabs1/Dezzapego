import {
  Smartphone,
  Sofa,
  Shirt,
  Dumbbell,
  Home,
  Car,
  Wrench,
  MoreHorizontal
} from 'lucide-react';

// Simple map for Dropdowns in Forms
export type CategoryMap = {
  [key: string]: string[];
};

export const CATEGORIES: CategoryMap = {
  'Eletrônicos': [
    'Celulares e Tablets',
    'Computadores e Notebooks',
    'Games e Consoles',
    'TV e Vídeo',
    'Áudio e Som',
    'Câmeras e Drones',
    'Acessórios',
    'Outros Eletrônicos'
  ],
  'Móveis': [
    'Sofás e Poltronas',
    'Mesas e Cadeiras',
    'Camas e Colchões',
    'Armários e Guarda-Roupas',
    'Estantes e Racks',
    'Escritório e Home Office',
    'Jardim e Área Externa',
    'Decoração',
    'Outros Móveis'
  ],
  'Roupas': [
    'Feminino',
    'Masculino',
    'Infantil',
    'Calçados',
    'Bolsas e Acessórios',
    'Esportivo',
    'Moda Praia',
    'Outras Roupas'
  ],
  'Esportes': [
    'Fitness e Musculação',
    'Ciclismo',
    'Futebol',
    'Camping e Pesca',
    'Surf e Skate',
    'Tênis e Raquetes',
    'Artes Marciais',
    'Outros Esportes'
  ],
  'Imóveis': [
    'Venda',
    'Aluguel',
    'Temporada',
    'Lançamentos'
  ],
  'Veículos': [
    'Carros',
    'Motos',
    'Caminhões',
    'Náutica',
    'Peças e Acessórios',
    'Outros Veículos'
  ],
  'Serviços': [
    'Assistência Técnica',
    'Aulas e Cursos',
    'Reformas e Serviços',
    'Saúde e Beleza',
    'Eventos e Festas',
    'Transporte',
    'Outros Serviços'
  ],
  'Outros': [
    'Brinquedos e Hobbies',
    'Música e Instrumentos',
    'Livros e Revistas',
    'Animais e Acessórios',
    'Colecionáveis',
    'Agro e Indústria',
    'Vagas de Emprego',
    'Diversos'
  ]
};

export const PROPERTY_TYPES = [
  'Casa',
  'Apartamento',
  'Terreno / Lote',
  'Sítio / Chácara',
  'Comercial',
  'Galpão',
  'Fazenda',
  'Outro'
];

export const CATEGORY_KEYS = Object.keys(CATEGORIES);

// Structured data for UI (Categories Component)
export const categoriesData = [
  {
    id: 'Eletrônicos',
    name: 'Eletrônicos',
    icon: Smartphone,
    count: 120, // Placeholder
    subcategories: CATEGORIES['Eletrônicos'].map(sub => ({ id: sub, name: sub, count: 0 }))
  },
  {
    id: 'Móveis',
    name: 'Móveis',
    icon: Sofa,
    count: 85,
    subcategories: CATEGORIES['Móveis'].map(sub => ({ id: sub, name: sub, count: 0 }))
  },
  {
    id: 'Roupas',
    name: 'Roupas',
    icon: Shirt,
    count: 230,
    subcategories: CATEGORIES['Roupas'].map(sub => ({ id: sub, name: sub, count: 0 }))
  },
  {
    id: 'Esportes',
    name: 'Esportes',
    icon: Dumbbell,
    count: 45,
    subcategories: CATEGORIES['Esportes'].map(sub => ({ id: sub, name: sub, count: 0 }))
  },
  {
    id: 'Imóveis',
    name: 'Imóveis',
    icon: Home,
    count: 15,
    subcategories: CATEGORIES['Imóveis'].map(sub => ({ id: sub, name: sub, count: 0 }))
  },
  {
    id: 'Veículos',
    name: 'Veículos',
    icon: Car,
    count: 30,
    subcategories: CATEGORIES['Veículos'].map(sub => ({ id: sub, name: sub, count: 0 }))
  },
  {
    id: 'Serviços',
    name: 'Serviços',
    icon: Wrench,
    count: 60,
    subcategories: CATEGORIES['Serviços'].map(sub => ({ id: sub, name: sub, count: 0 }))
  },
  {
    id: 'Outros',
    name: 'Outros',
    icon: MoreHorizontal,
    count: 90,
    subcategories: CATEGORIES['Outros'].map(sub => ({ id: sub, name: sub, count: 0 }))
  },
];
