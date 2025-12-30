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
  'Imóveis': [
    'Venda - casas e apartamentos',
    'Aluguel - casas e apartamentos',
    'Temporada',
    'Terrenos, sítios e fazendas',
    'Comércio e indústria',
    'Lançamento'
  ],
  'Autos e Peças': [
    'Carros, Vans e Utilitários',
    'Motos',
    'Caminhões e Ônibus',
    'Barcos e Aeronaves',
    'Peças e Acessórios'
  ],
  'Para a sua Casa': [
    'Móveis',
    'Eletrodomésticos',
    'Materiais de Construção',
    'Jardim e Agricultura',
    'Utensílios Domésticos',
    'Decoração',
    'Cama, Mesa e Banho'
  ],
  'Eletrônicos e Celulares': [
    'Celulares e Telefonia',
    'Computadores e Acessórios',
    'Videogames',
    'TV e Vídeo',
    'Áudio',
    'Câmeras e Drones'
  ],
  'Música e Hobbies': [
    'Instrumentos Musicais',
    'Livros e Revistas',
    'Filmes e Música',
    'Coleções',
    'Artes e Antiguidades',
    'Brinquedos e Jogos'
  ],
  'Esportes e Lazer': [
    'Esportes e Ginástica',
    'Ciclismo',
    'Camping e Pesca',
    'Skate e Patins'
  ],
  'Moda e Beleza': [
    'Roupas e Calçados',
    'Bolsas, Malas e Mochilas',
    'Beleza e Saúde',
    'Acessórios',
    'Artigos Infantis'
  ],
  'Agro e Indústria': [
    'Animais de Fazenda',
    'Maquinaria Agrícola',
    'Comércio e Escritório',
    'Equipamentos Industriais'
  ],
  'Serviços': [
    'Assistência Técnica',
    'Aulas',
    'Consultoria',
    'Design',
    'Eventos',
    'Limpeza',
    'Reformas',
    'Saúde',
    'Turismo',
    'Transporte',
    'Outros'
  ],
  'Vagas de Emprego': [
    'Administrativo e Financeiro',
    'Comercial e Vendas',
    'TI e Tecnologia',
    'Saúde e Medicina',
    'Educação',
    'Engenharia e Arquitetura',
    'Marketing e Comunicação',
    'Serviços Gerais',
    'Transporte e Logística',
    'Outros'
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
    id: 'Imóveis',
    name: 'Imóveis',
    icon: Home,
    count: 15,
    subcategories: CATEGORIES['Imóveis'].map(sub => ({ id: sub, name: sub, count: 0 }))
  },
  {
    id: 'Autos e Peças',
    name: 'Autos e Peças',
    icon: Car,
    count: 30,
    subcategories: CATEGORIES['Autos e Peças'].map(sub => ({ id: sub, name: sub, count: 0 }))
  },
  {
    id: 'Para a sua Casa',
    name: 'Para a sua Casa',
    icon: Sofa,
    count: 85,
    subcategories: CATEGORIES['Para a sua Casa'].map(sub => ({ id: sub, name: sub, count: 0 }))
  },
  {
    id: 'Eletrônicos e Celulares',
    name: 'Eletrônicos e Celulares',
    icon: Smartphone,
    count: 120,
    subcategories: CATEGORIES['Eletrônicos e Celulares'].map(sub => ({ id: sub, name: sub, count: 0 }))
  },
  {
    id: 'Música e Hobbies',
    name: 'Música e Hobbies',
    icon: MoreHorizontal, // Placeholder icon
    count: 10,
    subcategories: CATEGORIES['Música e Hobbies'].map(sub => ({ id: sub, name: sub, count: 0 }))
  },
  {
    id: 'Esportes e Lazer',
    name: 'Esportes e Lazer',
    icon: Dumbbell,
    count: 45,
    subcategories: CATEGORIES['Esportes e Lazer'].map(sub => ({ id: sub, name: sub, count: 0 }))
  },
  {
    id: 'Moda e Beleza',
    name: 'Moda e Beleza',
    icon: Shirt,
    count: 230,
    subcategories: CATEGORIES['Moda e Beleza'].map(sub => ({ id: sub, name: sub, count: 0 }))
  },
  {
    id: 'Agro e Indústria',
    name: 'Agro e Indústria',
    icon: Wrench, // Placeholder icon
    count: 5,
    subcategories: CATEGORIES['Agro e Indústria'].map(sub => ({ id: sub, name: sub, count: 0 }))
  },
  {
    id: 'Serviços',
    name: 'Serviços',
    icon: Wrench,
    count: 60,
    subcategories: CATEGORIES['Serviços'].map(sub => ({ id: sub, name: sub, count: 0 }))
  },
  {
    id: 'Vagas de Emprego',
    name: 'Vagas de Emprego',
    icon: MoreHorizontal,
    count: 20,
    subcategories: CATEGORIES['Vagas de Emprego'].map(sub => ({ id: sub, name: sub, count: 0 }))
  },
];
