import { 
  Car, Home, Smartphone, Sofa, Shirt, Baby, Dumbbell, Briefcase, 
  Book, Music, Wrench, PawPrint, LucideIcon 
} from 'lucide-react';

export type Category = {
  id: string;
  name: string;
  icon: LucideIcon;
  count: string;
  subcategories: Subcategory[];
};

export type Subcategory = {
  id: string;
  name: string;
  count: string;
};

export const categoriesData: Category[] = [
  {
    id: 'veiculos',
    name: 'Veículos',
    icon: Car,
    count: '2.547',
    subcategories: [
      { id: 'carros', name: 'Carros', count: '1.234' },
      { id: 'motos', name: 'Motos', count: '567' },
      { id: 'caminhoes', name: 'Caminhões e Ônibus', count: '234' },
      { id: 'barcos', name: 'Barcos e Jet Skis', count: '89' },
      { id: 'pecas-veiculos', name: 'Peças e Acessórios', count: '423' },
    ],
  },
  {
    id: 'imoveis',
    name: 'Imóveis',
    icon: Home,
    count: '1.823',
    subcategories: [
      { id: 'apartamentos', name: 'Apartamentos', count: '789' },
      { id: 'casas', name: 'Casas', count: '456' },
      { id: 'terrenos', name: 'Terrenos e Sítios', count: '234' },
      { id: 'comercial', name: 'Imóveis Comerciais', count: '234' },
      { id: 'temporada', name: 'Temporada', count: '110' },
    ],
  },
  {
    id: 'eletronicos',
    name: 'Eletrônicos',
    icon: Smartphone,
    count: '3.421',
    subcategories: [
      { id: 'celulares', name: 'Celulares e Telefones', count: '987' },
      { id: 'computadores', name: 'Computadores e Notebooks', count: '654' },
      { id: 'tvs', name: 'TVs e Monitores', count: '432' },
      { id: 'audio', name: 'Áudio e Som', count: '345' },
      { id: 'cameras', name: 'Câmeras e Filmadoras', count: '234' },
      { id: 'videogames', name: 'Videogames', count: '456' },
      { id: 'tablets', name: 'Tablets e Leitores', count: '313' },
    ],
  },
  {
    id: 'moveis',
    name: 'Móveis',
    icon: Sofa,
    count: '987',
    subcategories: [
      { id: 'sala', name: 'Sala de Estar', count: '234' },
      { id: 'quarto', name: 'Quarto', count: '198' },
      { id: 'cozinha', name: 'Cozinha', count: '156' },
      { id: 'escritorio', name: 'Escritório', count: '189' },
      { id: 'decoracao', name: 'Decoração', count: '210' },
    ],
  },
  {
    id: 'moda',
    name: 'Moda',
    icon: Shirt,
    count: '1.654',
    subcategories: [
      { id: 'roupas-femininas', name: 'Roupas Femininas', count: '567' },
      { id: 'roupas-masculinas', name: 'Roupas Masculinas', count: '432' },
      { id: 'calcados', name: 'Calçados', count: '345' },
      { id: 'bolsas', name: 'Bolsas e Malas', count: '189' },
      { id: 'acessorios-moda', name: 'Acessórios', count: '121' },
    ],
  },
  {
    id: 'infantil',
    name: 'Infantil',
    icon: Baby,
    count: '892',
    subcategories: [
      { id: 'roupas-infantis', name: 'Roupas de Bebê e Criança', count: '234' },
      { id: 'brinquedos', name: 'Brinquedos', count: '345' },
      { id: 'moveis-infantis', name: 'Móveis para Bebê', count: '123' },
      { id: 'carrinhos', name: 'Carrinhos e Cadeirinhas', count: '98' },
      { id: 'seguranca', name: 'Segurança', count: '92' },
    ],
  },
  {
    id: 'esportes',
    name: 'Esportes',
    icon: Dumbbell,
    count: '743',
    subcategories: [
      { id: 'fitness', name: 'Fitness e Musculação', count: '234' },
      { id: 'futebol', name: 'Futebol', count: '123' },
      { id: 'natacao', name: 'Natação', count: '87' },
      { id: 'ciclismo', name: 'Ciclismo', count: '178' },
      { id: 'camping', name: 'Camping e Aventura', count: '121' },
    ],
  },
  {
    id: 'servicos',
    name: 'Serviços',
    icon: Briefcase,
    count: '1.234',
    subcategories: [
      { id: 'reformas', name: 'Reformas e Reparos', count: '345' },
      { id: 'limpeza', name: 'Limpeza', count: '234' },
      { id: 'festas', name: 'Festas e Eventos', count: '178' },
      { id: 'aulas', name: 'Aulas Particulares', count: '267' },
      { id: 'beleza', name: 'Beleza e Estética', count: '210' },
    ],
  },
  {
    id: 'livros',
    name: 'Livros',
    icon: Book,
    count: '456',
    subcategories: [
      { id: 'ficcao', name: 'Ficção e Literatura', count: '156' },
      { id: 'didaticos', name: 'Didáticos', count: '98' },
      { id: 'tecnicos', name: 'Técnicos e Profissionais', count: '87' },
      { id: 'infantis', name: 'Infantis', count: '76' },
      { id: 'revistas', name: 'Revistas e Gibis', count: '39' },
    ],
  },
  {
    id: 'instrumentos',
    name: 'Música',
    icon: Music,
    count: '321',
    subcategories: [
      { id: 'cordas', name: 'Instrumentos de Cordas', count: '123' },
      { id: 'teclas', name: 'Instrumentos de Teclas', count: '89' },
      { id: 'percussao', name: 'Percussão e Bateria', count: '67' },
      { id: 'equipamentos-audio', name: 'Equipamentos de Áudio', count: '42' },
    ],
  },
  {
    id: 'ferramentas',
    name: 'Ferramentas',
    icon: Wrench,
    count: '654',
    subcategories: [
      { id: 'eletricas', name: 'Ferramentas Elétricas', count: '234' },
      { id: 'manuais', name: 'Ferramentas Manuais', count: '178' },
      { id: 'jardim', name: 'Jardim e Quintal', count: '134' },
      { id: 'construcao', name: 'Construção', count: '108' },
    ],
  },
  {
    id: 'animais',
    name: 'Animais',
    icon: PawPrint,
    count: '543',
    subcategories: [
      { id: 'caes', name: 'Cães', count: '189' },
      { id: 'gatos', name: 'Gatos', count: '145' },
      { id: 'passaros', name: 'Pássaros', count: '76' },
      { id: 'peixes', name: 'Peixes e Aquários', count: '54' },
      { id: 'acessorios-pets', name: 'Acessórios para Pets', count: '79' },
    ],
  },
];
