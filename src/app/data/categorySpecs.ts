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
    'Veículos': {
        subcategories: ['Carros', 'Motos', 'Caminhões', 'Ônibus', 'Barcos', 'Peças e Acessórios', 'Outros'],
        fields: [
            { name: 'year', label: 'Ano', type: 'number', placeholder: 'Ex: 2020', required: true },
            { name: 'mileage', label: 'Quilometragem', type: 'number', unit: 'km', placeholder: 'Ex: 50000' },
            { name: 'fuel', label: 'Combustível', type: 'select', options: ['Flex', 'Gasolina', 'Etanol', 'Diesel', 'Elétrico', 'Híbrido'] },
            { name: 'gearbox', label: 'Câmbio', type: 'select', options: ['Automático', 'Manual', 'Automatizado'] },
            { name: 'gnv', label: 'Possui Kit GNV?', type: 'checkbox' },
            { name: 'color', label: 'Cor', type: 'text', placeholder: 'Ex: Prata' }
        ]
    },
    'Imóveis': {
        subcategories: ['Venda', 'Aluguel', 'Temporada', 'Lançamentos'],
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
    'Eletrônicos': {
        subcategories: ['Celulares', 'Computadores', 'Tablets', 'TVs', 'Videogames', 'Áudio', 'Câmeras', 'Acessórios'],
        fields: [
            { name: 'brand', label: 'Marca', type: 'text', placeholder: 'Ex: Samsung, Apple' },
            { name: 'model', label: 'Modelo', type: 'text', placeholder: 'Ex: Galaxy S20' },
            { name: 'condition', label: 'Condição Detalhada', type: 'select', options: ['Novo (Lacrado)', 'Usado (Como Novo)', 'Usado (Bom Estado)', 'Usado (Marcas de Uso)', 'Defeituoso/Para Peças'] },
            { name: 'storage', label: 'Armazenamento', type: 'text', placeholder: 'Ex: 128GB' }
        ]
    },
    'Serviços': {
        subcategories: ['Assistência Técnica', 'Aulas', 'Consultoria', 'Design', 'Eventos', 'Limpeza', 'Reformas', 'Saúde', 'Outros'],
        fields: [
            { name: 'availability', label: 'Disponibilidade', type: 'select', options: ['Segunda a Sexta', 'Finais de Semana', '24 Horas'] },
            { name: 'experience', label: 'Experiência (Anos)', type: 'number' }
        ]
    },
    'Móveis': {
        subcategories: ['Sofás', 'Mesas', 'Cadeiras', 'Armários', 'Camas', 'Decoração', 'Jardim', 'Outros'],
        fields: [
            { name: 'material', label: 'Material Principal', type: 'text', placeholder: 'Ex: Madeira, MDF, Vidro' },
            { name: 'color', label: 'Cor', type: 'text' }
        ]
    },
    'Moda e Beleza': {
        subcategories: ['Roupas', 'Calçados', 'Acessórios', 'Beleza', 'Perfumes', 'Outros'],
        fields: [
            { name: 'size', label: 'Tamanho', type: 'text', placeholder: 'Ex: M, 42, 36' },
            { name: 'gender', label: 'Gênero', type: 'select', options: ['Feminino', 'Masculino', 'Unissex', 'Infantil'] },
            { name: 'brand', label: 'Marca', type: 'text' }
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
            'Estágio',
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
