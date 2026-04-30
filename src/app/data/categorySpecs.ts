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
    subcategoryFields?: Record<string, CategoryField[]>;
};

export function getCategoryFields(category: string, subcategory?: string): CategoryField[] {
    const spec = CATEGORY_SPECS[category];
    if (!spec) return [];

    if (subcategory && spec.subcategoryFields?.[subcategory]) {
        return spec.subcategoryFields[subcategory];
    }

    return spec.fields || [];
}

const IMOVEIS_PROPERTY_DETAIL_FIELDS: CategoryField[] = [
    { name: 'det_academia', label: 'Detalhe: Academia', type: 'checkbox' },
    { name: 'det_aquecimento', label: 'Detalhe: Aquecimento', type: 'checkbox' },
    { name: 'det_ar_condicionado', label: 'Detalhe: Ar condicionado', type: 'checkbox' },
    { name: 'det_area_servico', label: 'Detalhe: Área de serviço', type: 'checkbox' },
    { name: 'det_armarios_cozinha', label: 'Detalhe: Armários na cozinha', type: 'checkbox' },
    { name: 'det_armarios_quarto', label: 'Detalhe: Armários no quarto', type: 'checkbox' },
    { name: 'det_banheiro_suite', label: 'Detalhe: Banheiro no quarto', type: 'checkbox' },
    { name: 'det_churrasqueira', label: 'Detalhe: Churrasqueira', type: 'checkbox' },
    { name: 'det_internet', label: 'Detalhe: Internet', type: 'checkbox' },
    { name: 'det_mobiliado', label: 'Detalhe: Mobiliado', type: 'checkbox' },
    { name: 'det_piscina', label: 'Detalhe: Piscina', type: 'checkbox' },
    { name: 'det_porteiro_24h', label: 'Detalhe: Porteiro 24h', type: 'checkbox' },
    { name: 'det_quarto_servico', label: 'Detalhe: Quarto de serviço', type: 'checkbox' },
    { name: 'det_salao_festas', label: 'Detalhe: Salão de festas', type: 'checkbox' },
    { name: 'det_tv_cabo', label: 'Detalhe: Tv a cabo', type: 'checkbox' },
    { name: 'det_varanda', label: 'Detalhe: Varanda', type: 'checkbox' },
];

const IMOVEIS_CONDO_DETAIL_FIELDS: CategoryField[] = [
    { name: 'cond_academia', label: 'Condomínio: Academia', type: 'checkbox' },
    { name: 'cond_area_murada', label: 'Condomínio: Área murada', type: 'checkbox' },
    { name: 'cond_fechado', label: 'Condomínio: Fechado', type: 'checkbox' },
    { name: 'cond_elevador', label: 'Condomínio: Elevador', type: 'checkbox' },
    { name: 'cond_permite_animais', label: 'Condomínio: Permitido animais', type: 'checkbox' },
    { name: 'cond_piscina', label: 'Condomínio: Piscina', type: 'checkbox' },
    { name: 'cond_portao_eletronico', label: 'Condomínio: Portão eletrônico', type: 'checkbox' },
    { name: 'cond_portaria', label: 'Condomínio: Portaria', type: 'checkbox' },
    { name: 'cond_salao_festas', label: 'Condomínio: Salão de festas', type: 'checkbox' },
    { name: 'cond_seguranca_24h', label: 'Condomínio: Segurança 24h', type: 'checkbox' },
];

const IMOVEIS_COST_FIELDS: CategoryField[] = [
    { name: 'condominium', label: 'Valor Condomínio', type: 'number', unit: 'R$', placeholder: 'Ex: 450,00', required: true },
    { name: 'iptu', label: 'Valor IPTU', type: 'number', unit: 'R$', placeholder: 'Ex: 180,00', required: true },
    { name: 'iptu_period', label: 'Periodicidade do IPTU', type: 'select', options: ['Mensal', 'Anual'], required: true },
];

export const CATEGORY_SPECS: Record<string, CategorySpec> = {
    'Imóveis': {
        subcategories: ['Venda - casas e apartamentos', 'Aluguel - casas e apartamentos', 'Temporada', 'Terrenos, sítios e fazendas', 'Comércio e indústria', 'Lançamento'],
        fields: [
            { name: 'type', label: 'Tipo de Imóvel', type: 'select', options: ['Casa', 'Apartamento', 'Terreno', 'Comercial', 'Sítio/Chácara'], required: true },
            { name: 'bedrooms', label: 'Quartos', type: 'number', placeholder: 'Ex: 2', required: true },
            { name: 'bathrooms', label: 'Banheiros', type: 'number', placeholder: 'Ex: 1', required: true },
            { name: 'garage', label: 'Vagas', type: 'number', placeholder: 'Ex: 1', required: true },
            { name: 'area', label: 'Área Útil', type: 'number', unit: 'm²', placeholder: 'Ex: 60', required: true },
            { name: 'condominium', label: 'Valor Condomínio', type: 'number', unit: 'R$', placeholder: '0.00', required: true },
            { name: 'iptu', label: 'Valor IPTU', type: 'number', unit: 'R$', placeholder: '0.00', required: true },
            { name: 'det_academia', label: 'Detalhe: Academia', type: 'checkbox' },
            { name: 'det_aquecimento', label: 'Detalhe: Aquecimento', type: 'checkbox' },
            { name: 'det_ar_condicionado', label: 'Detalhe: Ar condicionado', type: 'checkbox' },
            { name: 'det_area_servico', label: 'Detalhe: Área de serviço', type: 'checkbox' },
            { name: 'det_armarios_cozinha', label: 'Detalhe: Armários na cozinha', type: 'checkbox' },
            { name: 'det_armarios_quarto', label: 'Detalhe: Armários no quarto', type: 'checkbox' },
            { name: 'det_banheiro_suite', label: 'Detalhe: Banheiro no quarto', type: 'checkbox' },
            { name: 'det_churrasqueira', label: 'Detalhe: Churrasqueira', type: 'checkbox' },
            { name: 'det_internet', label: 'Detalhe: Internet', type: 'checkbox' },
            { name: 'det_mobiliado', label: 'Detalhe: Mobiliado', type: 'checkbox' },
            { name: 'det_piscina', label: 'Detalhe: Piscina', type: 'checkbox' },
            { name: 'det_porteiro_24h', label: 'Detalhe: Porteiro 24h', type: 'checkbox' },
            { name: 'det_quarto_servico', label: 'Detalhe: Quarto de serviço', type: 'checkbox' },
            { name: 'det_salao_festas', label: 'Detalhe: Salão de festas', type: 'checkbox' },
            { name: 'det_tv_cabo', label: 'Detalhe: Tv a cabo', type: 'checkbox' },
            { name: 'det_varanda', label: 'Detalhe: Varanda', type: 'checkbox' },
            { name: 'cond_academia', label: 'Condomínio: Academia', type: 'checkbox' },
            { name: 'cond_area_murada', label: 'Condomínio: Área murada', type: 'checkbox' },
            { name: 'cond_fechado', label: 'Condomínio: Fechado', type: 'checkbox' },
            { name: 'cond_elevador', label: 'Condomínio: Elevador', type: 'checkbox' },
            { name: 'cond_permite_animais', label: 'Condomínio: Permitido animais', type: 'checkbox' },
            { name: 'cond_piscina', label: 'Condomínio: Piscina', type: 'checkbox' },
            { name: 'cond_portao_eletronico', label: 'Condomínio: Portão eletrônico', type: 'checkbox' },
            { name: 'cond_portaria', label: 'Condomínio: Portaria', type: 'checkbox' },
            { name: 'cond_salao_festas', label: 'Condomínio: Salão de festas', type: 'checkbox' },
            { name: 'cond_seguranca_24h', label: 'Condomínio: Segurança 24h', type: 'checkbox' }
        ],
        subcategoryFields: {
            'Venda - casas e apartamentos': [
                { name: 'property_status', label: 'Situação do imóvel', type: 'select', options: ['Novo', 'Usado', 'Na planta'], required: true },
                { name: 'accept_financing', label: 'Aceita financiamento?', type: 'checkbox' },
                { name: 'accept_exchange_property', label: 'Aceita permuta?', type: 'checkbox' },
                ...IMOVEIS_COST_FIELDS,
                ...IMOVEIS_PROPERTY_DETAIL_FIELDS,
                ...IMOVEIS_CONDO_DETAIL_FIELDS,
            ],
            'Aluguel - casas e apartamentos': [
                { name: 'rental_period', label: 'Período mínimo', type: 'select', options: ['30 dias', '6 meses', '12 meses'], required: true },
                { name: 'allows_pets', label: 'Aceita pets?', type: 'checkbox' },
                { name: 'furnished_rental', label: 'Mobiliado para aluguel?', type: 'checkbox' },
                ...IMOVEIS_COST_FIELDS,
                ...IMOVEIS_PROPERTY_DETAIL_FIELDS,
                ...IMOVEIS_CONDO_DETAIL_FIELDS,
            ],
            'Temporada': [
                { name: 'daily_rate', label: 'Valor da diária', type: 'number', unit: 'R$', required: true, placeholder: 'Ex: 250' },
                { name: 'max_guests', label: 'Hóspedes máximos', type: 'number', required: true, placeholder: 'Ex: 6' },
                { name: 'minimum_nights', label: 'Mínimo de noites', type: 'number', placeholder: 'Ex: 2' },
                ...IMOVEIS_PROPERTY_DETAIL_FIELDS,
                ...IMOVEIS_CONDO_DETAIL_FIELDS,
            ],
            'Terrenos, sítios e fazendas': [
                { name: 'land_area', label: 'Área do terreno', type: 'number', unit: 'm²', required: true, placeholder: 'Ex: 1000' },
                { name: 'has_deed', label: 'Possui escritura?', type: 'checkbox' },
                { name: 'rural_or_urban', label: 'Tipo de área', type: 'select', options: ['Urbana', 'Rural'], required: true },
                ...IMOVEIS_COST_FIELDS,
                ...IMOVEIS_PROPERTY_DETAIL_FIELDS,
                ...IMOVEIS_CONDO_DETAIL_FIELDS,
            ],
            'Comércio e indústria': [
                { name: 'commercial_type', label: 'Tipo comercial', type: 'select', options: ['Loja', 'Sala', 'Galpão', 'Prédio', 'Outro'], required: true },
                { name: 'monthly_condominium', label: 'Condomínio mensal', type: 'number', unit: 'R$', placeholder: 'Ex: 850' },
                { name: 'loading_dock', label: 'Tem doca de carga?', type: 'checkbox' },
                ...IMOVEIS_COST_FIELDS,
                ...IMOVEIS_PROPERTY_DETAIL_FIELDS,
                ...IMOVEIS_CONDO_DETAIL_FIELDS,
            ],
            'Lançamento': [
                { name: 'launch_stage', label: 'Fase do lançamento', type: 'select', options: ['Pré-lançamento', 'Lançamento', 'Obras'], required: true },
                { name: 'delivery_forecast', label: 'Previsão de entrega', type: 'text', required: true, placeholder: 'Ex: Dez/2027' },
                { name: 'has_showroom', label: 'Tem decorado para visita?', type: 'checkbox' },
                ...IMOVEIS_COST_FIELDS,
                ...IMOVEIS_PROPERTY_DETAIL_FIELDS,
                ...IMOVEIS_CONDO_DETAIL_FIELDS,
            ]
        }
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
        ],
        subcategoryFields: {
            'Carros, Vans e Utilitários': [
                { name: 'body_type', label: 'Carroceria', type: 'select', options: ['Hatch', 'Sedan', 'SUV', 'Pickup', 'Van'], required: true },
                { name: 'doors', label: 'Portas', type: 'number', required: true, placeholder: 'Ex: 4' },
                { name: 'plate_final', label: 'Final da placa', type: 'number', placeholder: 'Ex: 7' },
                { name: 'single_owner', label: 'Único dono?', type: 'checkbox' },
            ],
            'Motos': [
                { name: 'engine_displacement', label: 'Cilindrada', type: 'number', unit: 'cc', required: true, placeholder: 'Ex: 300' },
                { name: 'starter', label: 'Partida', type: 'select', options: ['Elétrica', 'Pedal', 'Ambas'] },
                { name: 'abs_brake', label: 'Freio ABS?', type: 'checkbox' },
            ],
            'Caminhões e Ônibus': [
                { name: 'axles', label: 'Número de eixos', type: 'number', required: true, placeholder: 'Ex: 3' },
                { name: 'cargo_capacity', label: 'Capacidade de carga', type: 'text', placeholder: 'Ex: 12 toneladas' },
                { name: 'has_tracker', label: 'Possui rastreador?', type: 'checkbox' },
            ],
            'Barcos e Aeronaves': [
                { name: 'vehicle_class', label: 'Classe', type: 'select', options: ['Lancha', 'Veleiro', 'Jet ski', 'Ultraleve', 'Helicóptero', 'Outro'], required: true },
                { name: 'engine_hours', label: 'Horas de motor', type: 'number', placeholder: 'Ex: 450' },
                { name: 'nautical_length', label: 'Comprimento', type: 'number', unit: 'm', placeholder: 'Ex: 7' },
            ],
            'Peças e Acessórios': [
                { name: 'part_type', label: 'Tipo de peça', type: 'text', required: true, placeholder: 'Ex: Para-choque, farol' },
                { name: 'compatible_models', label: 'Modelos compatíveis', type: 'text', required: true, placeholder: 'Ex: Gol G6, Onix 2020' },
                { name: 'original_part', label: 'Peça original?', type: 'checkbox' },
            ]
        }
    },
    'Para a sua Casa': {
        subcategories: ['Móveis', 'Eletrodomésticos', 'Materiais de Construção', 'Jardim e Agricultura', 'Utensílios Domésticos', 'Decoração', 'Cama, Mesa e Banho'],
        fields: [
            { name: 'condition', label: 'Condição', type: 'select', options: ['Novo', 'Semi-novo', 'Usado'] },
            { name: 'material', label: 'Material', type: 'text', placeholder: 'Ex: Madeira, Inox' },
            { name: 'color', label: 'Cor', type: 'text' }
        ],
        subcategoryFields: {
            'Móveis': [
                { name: 'furniture_type', label: 'Tipo de móvel', type: 'select', options: ['Sofá', 'Mesa', 'Cadeira', 'Guarda-roupa', 'Cama', 'Outro'], required: true },
                { name: 'dimensions', label: 'Dimensões', type: 'text', placeholder: 'Ex: 2,00m x 0,90m' },
                { name: 'assembled', label: 'Já montado?', type: 'checkbox' },
            ],
            'Eletrodomésticos': [
                { name: 'appliance_type', label: 'Tipo', type: 'select', options: ['Geladeira', 'Fogão', 'Micro-ondas', 'Máquina de lavar', 'Outro'], required: true },
                { name: 'voltage', label: 'Voltagem', type: 'select', options: ['110V', '220V', 'Bivolt'], required: true },
                { name: 'energy_class', label: 'Classe energética', type: 'select', options: ['A', 'B', 'C', 'D', 'E'] },
            ],
            'Materiais de Construção': [
                { name: 'material_type', label: 'Tipo de material', type: 'text', required: true, placeholder: 'Ex: Cimento, piso, tijolo' },
                { name: 'quantity', label: 'Quantidade', type: 'text', required: true, placeholder: 'Ex: 50 sacos, 20m²' },
                { name: 'new_batch', label: 'Lote novo?', type: 'checkbox' },
            ],
            'Jardim e Agricultura': [
                { name: 'garden_type', label: 'Tipo', type: 'select', options: ['Ferramenta', 'Planta', 'Vaso', 'Sistema de irrigação', 'Outro'], required: true },
                { name: 'usage_time', label: 'Tempo de uso', type: 'text', placeholder: 'Ex: 6 meses' },
                { name: 'delivery', label: 'Entrega disponível?', type: 'checkbox' },
            ],
            'Utensílios Domésticos': [
                { name: 'utensil_type', label: 'Tipo de utensílio', type: 'text', required: true, placeholder: 'Ex: Panela, talher, assadeira' },
                { name: 'set_size', label: 'Quantidade no conjunto', type: 'number', placeholder: 'Ex: 12' },
                { name: 'dishwasher_safe', label: 'Pode ir na lava-louças?', type: 'checkbox' },
            ],
            'Decoração': [
                { name: 'decor_style', label: 'Estilo', type: 'select', options: ['Moderno', 'Clássico', 'Rústico', 'Industrial', 'Outro'], required: true },
                { name: 'environment', label: 'Ambiente indicado', type: 'text', placeholder: 'Ex: Sala, quarto' },
                { name: 'wall_mount', label: 'Fixação em parede?', type: 'checkbox' },
            ],
            'Cama, Mesa e Banho': [
                { name: 'size', label: 'Tamanho', type: 'select', options: ['Solteiro', 'Casal', 'Queen', 'King', 'Infantil'], required: true },
                { name: 'fabric', label: 'Tecido', type: 'text', placeholder: 'Ex: Algodão 200 fios' },
                { name: 'pieces', label: 'Peças no kit', type: 'number', placeholder: 'Ex: 4' },
            ]
        }
    },
    'Eletrônicos e Celulares': {
        subcategories: ['Celulares e Telefonia', 'Computadores e Acessórios', 'Videogames', 'TV e Vídeo', 'Áudio', 'Câmeras e Drones'],
        fields: [
            { name: 'brand', label: 'Marca', type: 'text', placeholder: 'Ex: Samsung, Sony' },
            { name: 'model', label: 'Modelo', type: 'text', placeholder: 'Ex: PlayStation 5' },
            { name: 'condition', label: 'Condição', type: 'select', options: ['Novo', 'Usado - Excelente', 'Usado - Bom', 'Defeito'] },
            { name: 'storage', label: 'Armazenamento', type: 'text', placeholder: 'Ex: 128GB' }
        ],
        subcategoryFields: {
            'Celulares e Telefonia': [
                { name: 'brand', label: 'Marca', type: 'text', required: true },
                { name: 'model', label: 'Modelo', type: 'text', required: true },
                { name: 'storage', label: 'Armazenamento', type: 'select', options: ['64GB', '128GB', '256GB', '512GB', '1TB'], required: true },
                { name: 'battery_health', label: 'Saúde da bateria', type: 'number', unit: '%', placeholder: 'Ex: 88' },
                { name: 'dual_sim', label: 'Dual SIM?', type: 'checkbox' },
            ],
            'Computadores e Acessórios': [
                { name: 'device_type', label: 'Tipo de equipamento', type: 'select', options: ['Notebook', 'Desktop', 'Monitor', 'Periférico', 'Outro'], required: true },
                { name: 'processor', label: 'Processador', type: 'text', placeholder: 'Ex: Ryzen 7, i5' },
                { name: 'ram', label: 'Memória RAM', type: 'text', placeholder: 'Ex: 16GB' },
                { name: 'ssd', label: 'SSD', type: 'text', placeholder: 'Ex: 512GB' },
            ],
            'Videogames': [
                { name: 'console_generation', label: 'Geração', type: 'select', options: ['PS5', 'PS4', 'Xbox Series', 'Xbox One', 'Nintendo Switch', 'Outro'], required: true },
                { name: 'storage', label: 'Armazenamento', type: 'text', placeholder: 'Ex: 1TB' },
                { name: 'controllers', label: 'Quantidade de controles', type: 'number', placeholder: 'Ex: 2' },
                { name: 'includes_games', label: 'Inclui jogos?', type: 'checkbox' },
            ],
            'TV e Vídeo': [
                { name: 'screen_size', label: 'Tamanho da tela', type: 'number', unit: 'pol', required: true, placeholder: 'Ex: 55' },
                { name: 'resolution', label: 'Resolução', type: 'select', options: ['HD', 'Full HD', '4K', '8K'], required: true },
                { name: 'smart_tv', label: 'Smart TV?', type: 'checkbox' },
            ],
            'Áudio': [
                { name: 'audio_type', label: 'Tipo de áudio', type: 'select', options: ['Fone', 'Caixa de som', 'Home theater', 'Microfone', 'Outro'], required: true },
                { name: 'wireless', label: 'Sem fio?', type: 'checkbox' },
                { name: 'power_rms', label: 'Potência RMS', type: 'number', unit: 'W', placeholder: 'Ex: 120' },
            ],
            'Câmeras e Drones': [
                { name: 'camera_type', label: 'Tipo', type: 'select', options: ['Câmera DSLR', 'Mirrorless', 'Action Cam', 'Drone', 'Outro'], required: true },
                { name: 'recording_quality', label: 'Qualidade de gravação', type: 'select', options: ['Full HD', '2.7K', '4K', '5K'] },
                { name: 'flight_time', label: 'Tempo de voo', type: 'number', unit: 'min', placeholder: 'Ex: 28' },
            ]
        }
    },
    'Música e Hobbies': {
        subcategories: ['Instrumentos Musicais', 'Livros e Revistas', 'Filmes e Música', 'Coleções', 'Artes e Antiguidades', 'Brinquedos e Jogos'],
        fields: [
            { name: 'condition', label: 'Condição', type: 'select', options: ['Novo', 'Usado'] },
            { name: 'type', label: 'Tipo', type: 'text', placeholder: 'Ex: Violão, Livro Técnico' }
        ],
        subcategoryFields: {
            'Instrumentos Musicais': [
                { name: 'instrument_type', label: 'Tipo de instrumento', type: 'select', options: ['Cordas', 'Teclas', 'Sopro', 'Percussão', 'Outro'], required: true },
                { name: 'brand', label: 'Marca', type: 'text', placeholder: 'Ex: Yamaha, Tagima' },
                { name: 'includes_case', label: 'Inclui case?', type: 'checkbox' },
            ],
            'Livros e Revistas': [
                { name: 'genre', label: 'Gênero', type: 'select', options: ['Romance', 'Técnico', 'Infantil', 'Acadêmico', 'Outro'], required: true },
                { name: 'author', label: 'Autor', type: 'text' },
                { name: 'edition', label: 'Edição', type: 'text', placeholder: 'Ex: 3ª edição' },
            ],
            'Filmes e Música': [
                { name: 'media_type', label: 'Formato', type: 'select', options: ['DVD', 'Blu-ray', 'Vinil', 'CD', 'Outro'], required: true },
                { name: 'artist_or_title', label: 'Artista/Título', type: 'text', required: true },
                { name: 'collectible', label: 'Item de coleção?', type: 'checkbox' },
            ],
            'Coleções': [
                { name: 'collection_theme', label: 'Tema da coleção', type: 'text', required: true, placeholder: 'Ex: moedas, miniaturas' },
                { name: 'item_count', label: 'Quantidade de itens', type: 'number', placeholder: 'Ex: 45' },
                { name: 'certificate', label: 'Com certificado?', type: 'checkbox' },
            ],
            'Artes e Antiguidades': [
                { name: 'art_type', label: 'Tipo', type: 'select', options: ['Quadro', 'Escultura', 'Peça antiga', 'Objeto decorativo', 'Outro'], required: true },
                { name: 'period', label: 'Período/época', type: 'text', placeholder: 'Ex: Década de 50' },
                { name: 'signed_piece', label: 'Peça assinada?', type: 'checkbox' },
            ],
            'Brinquedos e Jogos': [
                { name: 'age_range', label: 'Faixa etária', type: 'text', required: true, placeholder: 'Ex: 8+' },
                { name: 'toy_type', label: 'Tipo', type: 'select', options: ['Educativo', 'Tabuleiro', 'Eletrônico', 'Boneco', 'Outro'], required: true },
                { name: 'complete_set', label: 'Conjunto completo?', type: 'checkbox' },
            ]
        }
    },
    'Esportes e Lazer': {
        subcategories: ['Esportes e Ginástica', 'Ciclismo', 'Camping e Pesca', 'Skate e Patins'],
        fields: [
            { name: 'condition', label: 'Condição', type: 'select', options: ['Novo', 'Usado'] },
            { name: 'brand', label: 'Marca', type: 'text' }
        ],
        subcategoryFields: {
            'Esportes e Ginástica': [
                { name: 'sport_type', label: 'Modalidade', type: 'text', required: true, placeholder: 'Ex: Musculação, futebol' },
                { name: 'weight_or_size', label: 'Peso/Tamanho', type: 'text', placeholder: 'Ex: 10kg, M' },
                { name: 'professional_use', label: 'Uso profissional?', type: 'checkbox' },
            ],
            'Ciclismo': [
                { name: 'bike_type', label: 'Tipo de bike', type: 'select', options: ['Urbana', 'MTB', 'Speed', 'Elétrica', 'Infantil'], required: true },
                { name: 'frame_size', label: 'Tamanho do quadro', type: 'text', placeholder: 'Ex: 17' },
                { name: 'suspension', label: 'Possui suspensão?', type: 'checkbox' },
            ],
            'Camping e Pesca': [
                { name: 'camping_type', label: 'Tipo', type: 'select', options: ['Barraca', 'Mochila', 'Vara', 'Carretilha', 'Outro'], required: true },
                { name: 'capacity', label: 'Capacidade', type: 'text', placeholder: 'Ex: 4 pessoas' },
                { name: 'waterproof', label: 'Impermeável?', type: 'checkbox' },
            ],
            'Skate e Patins': [
                { name: 'item_type', label: 'Item', type: 'select', options: ['Skate', 'Longboard', 'Patins', 'Acessório'], required: true },
                { name: 'size', label: 'Tamanho', type: 'text', placeholder: 'Ex: 39-42, 8.0' },
                { name: 'bearings_new', label: 'Rolamentos novos?', type: 'checkbox' },
            ]
        }
    },
    'Moda e Beleza': {
        subcategories: ['Roupas e Calçados', 'Bolsas, Malas e Mochilas', 'Beleza e Saúde', 'Acessórios', 'Artigos Infantis'],
        fields: [
            { name: 'size', label: 'Tamanho', type: 'text', placeholder: 'Ex: M, 42, 36' },
            { name: 'gender', label: 'Gênero', type: 'select', options: ['Feminino', 'Masculino', 'Unissex', 'Infantil'] },
            { name: 'brand', label: 'Marca', type: 'text' }
        ],
        subcategoryFields: {
            'Roupas e Calçados': [
                { name: 'size', label: 'Tamanho', type: 'text', required: true, placeholder: 'Ex: M, 42, 36' },
                { name: 'gender', label: 'Gênero', type: 'select', options: ['Feminino', 'Masculino', 'Unissex', 'Infantil'], required: true },
                { name: 'fabric', label: 'Tecido', type: 'text', placeholder: 'Ex: Algodão' },
            ],
            'Bolsas, Malas e Mochilas': [
                { name: 'item_type', label: 'Tipo', type: 'select', options: ['Bolsa', 'Mala', 'Mochila'], required: true },
                { name: 'capacity', label: 'Capacidade', type: 'text', placeholder: 'Ex: 40L' },
                { name: 'has_wheels', label: 'Tem rodinhas?', type: 'checkbox' },
            ],
            'Beleza e Saúde': [
                { name: 'product_type', label: 'Tipo de produto', type: 'select', options: ['Cosmético', 'Skincare', 'Aparelho', 'Suplemento', 'Outro'], required: true },
                { name: 'sealed', label: 'Lacrado?', type: 'checkbox' },
                { name: 'expiration_date', label: 'Validade', type: 'text', placeholder: 'Ex: 12/2027' },
            ],
            'Acessórios': [
                { name: 'accessory_type', label: 'Tipo', type: 'select', options: ['Relógio', 'Óculos', 'Joia', 'Bijuteria', 'Outro'], required: true },
                { name: 'material', label: 'Material', type: 'text', placeholder: 'Ex: Aço inox, prata' },
                { name: 'original_item', label: 'Item original?', type: 'checkbox' },
            ],
            'Artigos Infantis': [
                { name: 'age_range', label: 'Faixa etária', type: 'text', required: true, placeholder: 'Ex: 2 a 4 anos' },
                { name: 'item_type', label: 'Tipo de item', type: 'text', required: true, placeholder: 'Ex: Carrinho, roupa, brinquedo' },
                { name: 'safety_certified', label: 'Certificado de segurança?', type: 'checkbox' },
            ]
        }
    },
    'Agro e Indústria': {
        subcategories: ['Animais de Fazenda', 'Maquinaria Agrícola', 'Comércio e Escritório', 'Equipamentos Industriais'],
        fields: [
            { name: 'condition', label: 'Condição', type: 'select', options: ['Novo', 'Seminovo', 'Usado', 'Recondicionado'], required: true },
            { name: 'type', label: 'Tipo', type: 'text', placeholder: 'Ex: Trator, Torno CNC, Balança', required: true },
            { name: 'brand', label: 'Marca', type: 'text', placeholder: 'Ex: John Deere, WEG, Tramontina' },
            { name: 'model', label: 'Modelo', type: 'text', placeholder: 'Ex: 6110J, TQ-300' },
            { name: 'year', label: 'Ano de Fabricação', type: 'number', placeholder: 'Ex: 2021' },
            { name: 'power', label: 'Potência', type: 'number', unit: 'cv', placeholder: 'Ex: 110' },
            { name: 'hours_used', label: 'Horas de Uso', type: 'number', unit: 'h', placeholder: 'Ex: 2500' },
            { name: 'area_hectares', label: 'Área (hectares)', type: 'number', unit: 'ha', placeholder: 'Ex: 15' },
            { name: 'capacity', label: 'Capacidade', type: 'text', placeholder: 'Ex: 2.000 L, 5 ton/h' },
            { name: 'voltage', label: 'Voltagem', type: 'select', options: ['110V', '220V', '380V', 'Bivolt', 'Trifásico'] },
            { name: 'fuel', label: 'Combustível', type: 'select', options: ['Diesel', 'Gasolina', 'Etanol', 'Elétrico', 'Não se aplica'] },
            { name: 'origin', label: 'Procedência', type: 'select', options: ['Nacional', 'Importado'] },
            { name: 'accept_exchange', label: 'Aceita troca?', type: 'checkbox' },
            { name: 'financing', label: 'Aceita financiamento?', type: 'checkbox' },
            { name: 'delivery', label: 'Entrega disponível?', type: 'checkbox' },
            { name: 'warranty', label: 'Possui garantia?', type: 'checkbox' }
        ],
        subcategoryFields: {
            'Animais de Fazenda': [
                { name: 'condition', label: 'Condição', type: 'select', options: ['Novo', 'Seminovo', 'Usado'], required: true },
                { name: 'species', label: 'Espécie', type: 'select', options: ['Bovino', 'Equino', 'Suíno', 'Caprino', 'Ovino', 'Ave', 'Outro'], required: true },
                { name: 'breed', label: 'Raça', type: 'text', placeholder: 'Ex: Nelore, Mangalarga' },
                { name: 'sex', label: 'Sexo', type: 'select', options: ['Macho', 'Fêmea', 'Lote misto'] },
                { name: 'age_months', label: 'Idade (meses)', type: 'number', placeholder: 'Ex: 18' },
                { name: 'quantity', label: 'Quantidade', type: 'number', placeholder: 'Ex: 25', required: true },
                { name: 'vaccinated', label: 'Vacinado?', type: 'checkbox' },
                { name: 'has_registry', label: 'Possui registro?', type: 'checkbox' },
                { name: 'delivery', label: 'Entrega disponível?', type: 'checkbox' },
            ],
            'Maquinaria Agrícola': [
                { name: 'condition', label: 'Condição', type: 'select', options: ['Novo', 'Seminovo', 'Usado', 'Recondicionado'], required: true },
                { name: 'machine_category', label: 'Categoria da máquina', type: 'select', options: ['Trator', 'Colheitadeira', 'Pulverizador', 'Plantadeira', 'Implemento', 'Outro'], required: true },
                { name: 'brand', label: 'Marca', type: 'text', placeholder: 'Ex: John Deere, Valtra' },
                { name: 'model', label: 'Modelo', type: 'text', placeholder: 'Ex: 6110J' },
                { name: 'year', label: 'Ano de Fabricação', type: 'number', placeholder: 'Ex: 2021' },
                { name: 'traction', label: 'Tração', type: 'select', options: ['4x2', '4x4', 'Não se aplica'] },
                { name: 'engine_power_cv', label: 'Potência do motor', type: 'number', unit: 'cv', placeholder: 'Ex: 180' },
                { name: 'hours_used', label: 'Horas de Uso', type: 'number', unit: 'h', placeholder: 'Ex: 2500' },
                { name: 'working_width', label: 'Largura de trabalho', type: 'number', unit: 'm', placeholder: 'Ex: 6' },
                { name: 'autopilot_ready', label: 'Preparado para piloto automático?', type: 'checkbox' },
                { name: 'accept_exchange', label: 'Aceita troca?', type: 'checkbox' },
                { name: 'financing', label: 'Aceita financiamento?', type: 'checkbox' },
                { name: 'warranty', label: 'Possui garantia?', type: 'checkbox' },
            ],
            'Comércio e Escritório': [
                { name: 'condition', label: 'Condição', type: 'select', options: ['Novo', 'Seminovo', 'Usado'], required: true },
                { name: 'type', label: 'Tipo', type: 'text', placeholder: 'Ex: Balcão, Cadeira, Impressora', required: true },
                { name: 'sector', label: 'Setor', type: 'select', options: ['Varejo', 'Alimentação', 'Serviços', 'Logística', 'Administrativo', 'Outro'], required: true },
                { name: 'brand', label: 'Marca', type: 'text', placeholder: 'Ex: Dell, Epson, Pandin' },
                { name: 'furniture_state', label: 'Estado do mobiliário', type: 'select', options: ['Novo', 'Bom', 'Regular'] },
                { name: 'dimensions', label: 'Dimensões', type: 'text', placeholder: 'Ex: 1,20m x 0,80m' },
                { name: 'ergonomic', label: 'Ergonômico?', type: 'checkbox' },
                { name: 'assembly_included', label: 'Montagem inclusa?', type: 'checkbox' },
                { name: 'delivery', label: 'Entrega disponível?', type: 'checkbox' },
            ],
            'Equipamentos Industriais': [
                { name: 'condition', label: 'Condição', type: 'select', options: ['Novo', 'Seminovo', 'Usado', 'Recondicionado'], required: true },
                { name: 'type', label: 'Tipo', type: 'text', placeholder: 'Ex: Compressor, Injetora, Esteira', required: true },
                { name: 'brand', label: 'Marca', type: 'text', placeholder: 'Ex: WEG, Siemens, Romi' },
                { name: 'model', label: 'Modelo', type: 'text', placeholder: 'Ex: XPT-500' },
                { name: 'year', label: 'Ano de Fabricação', type: 'number', placeholder: 'Ex: 2020' },
                { name: 'industrial_segment', label: 'Segmento industrial', type: 'select', options: ['Metalurgia', 'Alimentos', 'Têxtil', 'Plástico', 'Madeira', 'Químico', 'Outro'], required: true },
                { name: 'production_capacity', label: 'Capacidade de produção', type: 'text', placeholder: 'Ex: 800 peças/h' },
                { name: 'pressure_rating', label: 'Pressão de trabalho', type: 'text', placeholder: 'Ex: 8 bar' },
                { name: 'three_phase', label: 'Trifásico?', type: 'checkbox' },
                { name: 'has_manual', label: 'Manual técnico incluso?', type: 'checkbox' },
                { name: 'nr12_compliant', label: 'Conforme NR-12?', type: 'checkbox' },
                { name: 'financing', label: 'Aceita financiamento?', type: 'checkbox' },
                { name: 'warranty', label: 'Possui garantia?', type: 'checkbox' },
            ]
        }
    },
    'Serviços': {
        subcategories: ['Assistência Técnica', 'Aulas', 'Consultoria', 'Design', 'Eventos', 'Limpeza', 'Reformas', 'Saúde', 'Turismo', 'Transporte', 'Outros'],
        fields: [
            { name: 'availability', label: 'Disponibilidade', type: 'select', options: ['Segunda a Sexta', 'Finais de Semana', '24 Horas'] },
            { name: 'experience', label: 'Experiência (Anos)', type: 'number' }
        ],
        subcategoryFields: {
            'Assistência Técnica': [
                { name: 'service_area', label: 'Área de atuação', type: 'text', required: true, placeholder: 'Ex: celular, notebook' },
                { name: 'home_service', label: 'Atende em domicílio?', type: 'checkbox' },
                { name: 'warranty_days', label: 'Garantia (dias)', type: 'number', placeholder: 'Ex: 90' },
            ],
            'Aulas': [
                { name: 'subject', label: 'Disciplina/tema', type: 'text', required: true },
                { name: 'mode', label: 'Modalidade', type: 'select', options: ['Presencial', 'Online', 'Híbrido'], required: true },
                { name: 'hour_rate', label: 'Valor por hora', type: 'number', unit: 'R$', placeholder: 'Ex: 80' },
            ],
            'Consultoria': [
                { name: 'specialty', label: 'Especialidade', type: 'text', required: true, placeholder: 'Ex: Financeira, jurídica' },
                { name: 'service_mode', label: 'Formato', type: 'select', options: ['Projeto', 'Hora', 'Mensal'], required: true },
                { name: 'remote_service', label: 'Atendimento remoto?', type: 'checkbox' },
            ],
            'Design': [
                { name: 'design_type', label: 'Tipo de design', type: 'select', options: ['Logo', 'UI/UX', 'Social media', 'Impressos', 'Outro'], required: true },
                { name: 'portfolio_link', label: 'Link do portfólio', type: 'text', placeholder: 'Ex: behance.net/...'},
                { name: 'includes_revisions', label: 'Inclui revisões?', type: 'checkbox' },
            ],
            'Eventos': [
                { name: 'event_type', label: 'Tipo de evento', type: 'text', required: true, placeholder: 'Ex: Casamento, corporativo' },
                { name: 'team_size', label: 'Tamanho da equipe', type: 'number', placeholder: 'Ex: 5' },
                { name: 'travel_available', label: 'Atende outras cidades?', type: 'checkbox' },
            ],
            'Limpeza': [
                { name: 'cleaning_type', label: 'Tipo de limpeza', type: 'select', options: ['Residencial', 'Comercial', 'Pós-obra', 'Estofados'], required: true },
                { name: 'provides_products', label: 'Leva produtos?', type: 'checkbox' },
                { name: 'hour_rate', label: 'Valor por hora', type: 'number', unit: 'R$', placeholder: 'Ex: 35' },
            ],
            'Reformas': [
                { name: 'reform_type', label: 'Tipo de reforma', type: 'text', required: true, placeholder: 'Ex: Pintura, elétrica, hidráulica' },
                { name: 'issues_invoice', label: 'Emite nota fiscal?', type: 'checkbox' },
                { name: 'technical_visit', label: 'Faz visita técnica?', type: 'checkbox' },
            ],
            'Saúde': [
                { name: 'health_specialty', label: 'Especialidade', type: 'text', required: true, placeholder: 'Ex: Psicologia, fisioterapia' },
                { name: 'professional_register', label: 'Registro profissional', type: 'text', placeholder: 'Ex: CRP 00/00000' },
                { name: 'online_appointment', label: 'Atende online?', type: 'checkbox' },
            ],
            'Turismo': [
                { name: 'tourism_service', label: 'Serviço', type: 'select', options: ['Passeio', 'Guia', 'Pacote', 'Transfer', 'Outro'], required: true },
                { name: 'language', label: 'Idiomas', type: 'text', placeholder: 'Ex: Português, Inglês' },
                { name: 'travel_insurance', label: 'Inclui seguro?', type: 'checkbox' },
            ],
            'Transporte': [
                { name: 'transport_type', label: 'Tipo de transporte', type: 'select', options: ['Mudança', 'Frete', 'Executivo', 'Escolar', 'Outro'], required: true },
                { name: 'vehicle_size', label: 'Porte do veículo', type: 'text', placeholder: 'Ex: VUC, caminhão 3/4' },
                { name: 'tracking', label: 'Com rastreamento?', type: 'checkbox' },
            ],
            'Outros': [
                { name: 'service_description', label: 'Descrição do serviço', type: 'text', required: true, placeholder: 'Descreva seu serviço' },
                { name: 'custom_quote', label: 'Orçamento personalizado?', type: 'checkbox' },
            ]
        }
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
        ],
        subcategoryFields: {
            'Administrativo e Financeiro': [
                { name: 'contractType', label: 'Tipo de Contrato', type: 'select', options: ['CLT', 'PJ', 'Temporário', 'Estágio'], required: true },
                { name: 'workMode', label: 'Modalidade', type: 'select', options: ['Presencial', 'Remoto', 'Híbrido'], required: true },
                { name: 'experience_years', label: 'Experiência mínima', type: 'number', unit: 'anos', placeholder: 'Ex: 2' },
            ],
            'Comercial e Vendas': [
                { name: 'contractType', label: 'Tipo de Contrato', type: 'select', options: ['CLT', 'PJ', 'Comissionado', 'Freelance'], required: true },
                { name: 'has_commission', label: 'Comissionamento?', type: 'checkbox' },
                { name: 'requires_vehicle', label: 'Precisa veículo próprio?', type: 'checkbox' },
            ],
            'TI e Tecnologia': [
                { name: 'tech_stack', label: 'Stack principal', type: 'text', required: true, placeholder: 'Ex: React, Node, Python' },
                { name: 'seniority', label: 'Senioridade', type: 'select', options: ['Júnior', 'Pleno', 'Sênior', 'Especialista'], required: true },
                { name: 'workMode', label: 'Modalidade', type: 'select', options: ['Presencial', 'Remoto', 'Híbrido'], required: true },
            ],
            'Saúde e Medicina': [
                { name: 'professional_register', label: 'Registro profissional', type: 'text', required: true, placeholder: 'Ex: CRM, COREN, CRO' },
                { name: 'shift', label: 'Turno', type: 'select', options: ['Diurno', 'Noturno', 'Plantão', 'Escala'], required: true },
                { name: 'hazard_pay', label: 'Adicional de insalubridade?', type: 'checkbox' },
            ],
            'Educação': [
                { name: 'education_level', label: 'Nível de ensino', type: 'select', options: ['Infantil', 'Fundamental', 'Médio', 'Superior', 'Curso livre'], required: true },
                { name: 'subject', label: 'Disciplina', type: 'text', required: true },
                { name: 'teaching_license', label: 'Licenciatura exigida?', type: 'checkbox' },
            ],
            'Engenharia e Arquitetura': [
                { name: 'area', label: 'Área', type: 'text', required: true, placeholder: 'Ex: Civil, elétrica, arquitetura' },
                { name: 'software_required', label: 'Software obrigatório', type: 'text', placeholder: 'Ex: AutoCAD, Revit' },
                { name: 'crea_cau_required', label: 'Registro CREA/CAU exigido?', type: 'checkbox' },
            ],
            'Marketing e Comunicação': [
                { name: 'marketing_area', label: 'Área de atuação', type: 'select', options: ['Social media', 'Performance', 'Conteúdo', 'Design', 'CRM'], required: true },
                { name: 'portfolio_required', label: 'Portfólio obrigatório?', type: 'checkbox' },
                { name: 'tools', label: 'Ferramentas', type: 'text', placeholder: 'Ex: Meta Ads, Google Ads, RD' },
            ],
            'Serviços Gerais': [
                { name: 'service_role', label: 'Função', type: 'text', required: true, placeholder: 'Ex: Auxiliar de limpeza' },
                { name: 'shift', label: 'Turno', type: 'select', options: ['Diurno', 'Noturno', 'Escala'], required: true },
                { name: 'meal_allowance', label: 'Inclui vale-refeição?', type: 'checkbox' },
            ],
            'Transporte e Logística': [
                { name: 'license_category', label: 'Categoria CNH', type: 'select', options: ['A', 'B', 'C', 'D', 'E'], required: true },
                { name: 'mopp_required', label: 'MOPP obrigatório?', type: 'checkbox' },
                { name: 'route_type', label: 'Tipo de rota', type: 'select', options: ['Urbana', 'Intermunicipal', 'Interestadual'] },
            ],
            'Outros': [
                { name: 'position_name', label: 'Cargo', type: 'text', required: true, placeholder: 'Ex: Assistente operacional' },
                { name: 'contractType', label: 'Tipo de Contrato', type: 'select', options: ['CLT', 'PJ', 'Temporário', 'Freelance'], required: true },
                { name: 'workMode', label: 'Modalidade', type: 'select', options: ['Presencial', 'Remoto', 'Híbrido'] },
            ]
        }
    }
};
