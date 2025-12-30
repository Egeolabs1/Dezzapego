export type FieldType = 'number' | 'text' | 'select' | 'checkbox';

export type CategoryField = {
    name: string;
    label: string;
    type: FieldType;
    options?: string[]; // For 'select' type
    placeholder?: string;
    required?: boolean;
    unit?: string;
};

export type CategorySpec = {
    fields: CategoryField[];
    subcategories: string[];
};

export const CATEGORY_SPECS: Record<string, CategorySpec> = {
    'Imóveis': {
        subcategories: ['Venda - casas e apartamentos', 'Aluguel - casas e apartamentos', 'Temporada', 'Terrenos, sítios e fazendas', 'Comércio e indústria', 'Lançamento'],
        fields: [
            { name: 'type', label: 'Tipo de Imóvel', type: 'select', options: ['Casa', 'Apartamento', 'Terreno', 'Comercial', 'Sítio/Chácara'], required: true },
            { name: 'bedrooms', label: 'Quartos', type: 'number', placeholder: 'Ex: 2' },
            { name: 'bathrooms', label: 'Banheiros', type: 'number', placeholder: 'Ex: 1' },
            { name: 'garage', label: 'Vagas', type: 'number', placeholder: 'Ex: 1' },
            { name: 'area', label: 'Área Útil', type: 'number', unit: 'm²', placeholder: 'Ex: 60' },
            { name: 'condominium', label: 'Valor Condomínio', type: 'number', unit: 'R$', placeholder: '0.00' },
            { name: 'iptu', label: 'Valor IPTU', type: 'number', unit: 'R$', placeholder: '0.00' }
        ]
    },
    'Autos e Peças': {
        subcategories: ['Carros, Vans e Utilitários', 'Motos', 'Caminhões e Ônibus', 'Barcos e Aeronaves', 'Peças e Acessórios'],
        fields: [
            { name: 'year', label: 'Ano', type: 'number', placeholder: 'Ex: 2020', required: true },
            { name: 'mileage', label: 'Quilometragem', type: 'number', unit: 'km', placeholder: 'Ex: 50000' },
            { name: 'fuel', label: 'Combustível', type: 'select', options: ['Flex', 'Gasolina', 'Etanol', 'Diesel', 'Elétrico', 'Híbrido'] },
            { name: 'gearbox', label: 'Câmbio', type: 'select', options: ['Automático', 'Manual', 'Automatizado'] },
            { name: 'gnv', label: 'Possui Kit GNV?', type: 'checkbox' },
            { name: 'color', label: 'Cor', type: 'text', placeholder: 'Ex: Prata' }
        ]
    },
    'Para a sua Casa': {
        subcategories: ['Móveis', 'Eletrodomésticos', 'Materiais de Construção', 'Jardim e Agricultura', 'Utensílios Domésticos', 'Decoração', 'Cama, Mesa e Banho'],
        fields: [
            { name: 'condition', label: 'Condição', type: 'select', options: ['Novo', 'Semi-novo', 'Usado'] },
            { name: 'material', label: 'Material', type: 'text', placeholder: 'Ex: Madeira, Inox' },
            { name: 'color', label: 'Cor', type: 'text' }
        ]
    },
    'Eletrônicos e Celulares': {
        subcategories: ['Celulares e Telefonia', 'Computadores e Acessórios', 'Videogames', 'TV e Vídeo', 'Áudio', 'Câmeras e Drones'],
        fields: [
            { name: 'brand', label: 'Marca', type: 'text', placeholder: 'Ex: Samsung, Sony' },
            { name: 'model', label: 'Modelo', type: 'text', placeholder: 'Ex: PlayStation 5' },
            { name: 'condition', label: 'Condição', type: 'select', options: ['Novo', 'Usado - Excelente', 'Usado - Bom', 'Defeito'] },
            { name: 'storage', label: 'Armazenamento', type: 'text', placeholder: 'Ex: 128GB' }
        ]
    },
    'Música e Hobbies': {
        subcategories: ['Instrumentos Musicais', 'Livros e Revistas', 'Filmes e Música', 'Coleções', 'Artes e Antiguidades', 'Brinquedos e Jogos'],
        fields: [
            { name: 'condition', label: 'Condição', type: 'select', options: ['Novo', 'Usado'] },
            { name: 'type', label: 'Tipo', type: 'text', placeholder: 'Ex: Violão, Livro Técnico' }
        ]
    },
    'Esportes e Lazer': {
        subcategories: ['Esportes e Ginástica', 'Ciclismo', 'Camping e Pesca', 'Skate e Patins'],
        fields: [
            { name: 'condition', label: 'Condição', type: 'select', options: ['Novo', 'Usado'] },
            { name: 'brand', label: 'Marca', type: 'text' }
        ]
    },
    'Moda e Beleza': {
        subcategories: ['Roupas e Calçados', 'Bolsas, Malas e Mochilas', 'Beleza e Saúde', 'Acessórios', 'Artigos Infantis'],
        fields: [
            { name: 'size', label: 'Tamanho', type: 'text', placeholder: 'Ex: M, 42, 36' },
            { name: 'gender', label: 'Gênero', type: 'select', options: ['Feminino', 'Masculino', 'Unissex', 'Infantil'] },
            { name: 'brand', label: 'Marca', type: 'text' }
        ]
    },
    'Agro e Indústria': {
        subcategories: ['Animais de Fazenda', 'Maquinaria Agrícola', 'Comércio e Escritório', 'Equipamentos Industriais'],
        fields: [
            { name: 'condition', label: 'Condição', type: 'select', options: ['Novo', 'Usado'] },
            { name: 'type', label: 'Tipo', type: 'text' }
        ]
    },
    'Serviços': {
        subcategories: ['Assistência Técnica', 'Aulas', 'Consultoria', 'Design', 'Eventos', 'Limpeza', 'Reformas', 'Saúde', 'Turismo', 'Transporte', 'Outros'],
        fields: [
            { name: 'availability', label: 'Disponibilidade', type: 'select', options: ['Segunda a Sexta', 'Finais de Semana', '24 Horas'] },
            { name: 'experience', label: 'Experiência (Anos)', type: 'number' }
        ]
    },
    'Vagas de Emprego': {
        subcategories: [
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
        ],
        fields: [
            { name: 'contractType', label: 'Tipo de Contrato', type: 'select', options: ['CLT', 'PJ', 'Temporário', 'Estágio', 'Freelance', 'Sócio'] },
            { name: 'workMode', label: 'Modalidade', type: 'select', options: ['Presencial', 'Remoto', 'Híbrido'] },
            { name: 'journey', label: 'Jornada', type: 'select', options: ['Período Integral', 'Meio Período', 'Noturno', 'Escala', 'Flexível'] },
            { name: 'benefits', label: 'Benefícios', type: 'text', placeholder: 'Ex: VR, VT, Plano de Saúde' }
        ]
    }
};
