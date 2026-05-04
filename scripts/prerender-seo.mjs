#!/usr/bin/env node
/**
 * SSG pós-build: usa o bundle SSR do Vite para renderizar rotas públicas em
 * `dist/<rota>/index.html`, preservando o app React como SPA no cliente.
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

process.env.NODE_ENV = 'production';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const templatePath = path.join(distDir, 'index.html');
const serverEntryPath = path.join(distDir, 'server', 'entry-server.js');

const CATEGORIES = {
    Imóveis: [
        'Venda - casas e apartamentos',
        'Aluguel - casas e apartamentos',
        'Temporada',
        'Terrenos, sítios e fazendas',
        'Comércio e indústria',
        'Lançamento',
    ],
    'Autos e Peças': ['Carros, Vans e Utilitários', 'Motos', 'Caminhões e Ônibus', 'Barcos e Aeronaves', 'Peças e Acessórios'],
    'Para a sua Casa': ['Móveis', 'Eletrodomésticos', 'Materiais de Construção', 'Jardim e Agricultura', 'Utensílios Domésticos', 'Decoração', 'Cama, Mesa e Banho'],
    'Eletrônicos e Celulares': ['Celulares e Telefonia', 'Computadores e Acessórios', 'Videogames', 'TV e Vídeo', 'Áudio', 'Câmeras e Drones'],
    'Música e Hobbies': ['Instrumentos Musicais', 'Livros e Revistas', 'Filmes e Música', 'Coleções', 'Artes e Antiguidades', 'Brinquedos e Jogos'],
    'Esportes e Lazer': ['Esportes e Ginástica', 'Ciclismo', 'Camping e Pesca', 'Skate e Patins'],
    'Moda e Beleza': ['Roupas e Calçados', 'Bolsas, Malas e Mochilas', 'Beleza e Saúde', 'Acessórios', 'Artigos Infantis'],
    'Agro e Indústria': ['Animais de Fazenda', 'Maquinaria Agrícola', 'Comércio e Escritório', 'Equipamentos Industriais'],
    Serviços: ['Assistência Técnica', 'Aulas', 'Consultoria', 'Design', 'Eventos', 'Limpeza', 'Reformas', 'Saúde', 'Turismo', 'Transporte', 'Outros'],
    'Vagas de Emprego': ['Administrativo e Financeiro', 'Comercial e Vendas', 'TI e Tecnologia', 'Saúde e Medicina', 'Educação', 'Engenharia e Arquitetura', 'Marketing e Comunicação', 'Serviços Gerais', 'Transporte e Logística', 'Outros'],
};

const GUIDE_PATHS = [
    '/guias/como-vender-com-seguranca',
    '/guias/cuidados-ao-comprar-carro-usado',
    '/guias/como-anunciar-imovel',
    '/guias/como-tirar-fotos-para-vender-mais',
];

const SEO_LOCATIONS = [
    { stateSlug: 'sp', citySlug: 'sao-paulo' },
    { stateSlug: 'rj', citySlug: 'rio-de-janeiro' },
    { stateSlug: 'mg', citySlug: 'belo-horizonte' },
    { stateSlug: 'pr', citySlug: 'curitiba' },
    { stateSlug: 'rs', citySlug: 'porto-alegre' },
    { stateSlug: 'ba', citySlug: 'salvador' },
    { stateSlug: 'pe', citySlug: 'recife' },
    { stateSlug: 'ce', citySlug: 'fortaleza' },
    { stateSlug: 'df', citySlug: 'brasilia' },
    { stateSlug: 'go', citySlug: 'goiania' },
    { stateSlug: 'sp', citySlug: 'campinas' },
    { stateSlug: 'sc', citySlug: 'florianopolis' },
];

function slugify(value) {
    return String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/&/g, ' e ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function buildRoutes() {
    const routes = [
        '/',
        '/sobre',
        '/planos',
        '/contato',
        '/termos',
        '/privacidade',
        '/dicas-seguranca',
        '/mapa-do-site',
        ...GUIDE_PATHS,
    ];

    for (const [category, subcategories] of Object.entries(CATEGORIES)) {
        const categorySlug = slugify(category);
        routes.push(`/categoria/${categorySlug}`);
        for (const subcategory of subcategories) {
            routes.push(`/categoria/${categorySlug}/${slugify(subcategory)}`);
        }
        for (const location of SEO_LOCATIONS) {
            routes.push(`/cidade/${location.stateSlug}/${location.citySlug}/${categorySlug}`);
        }
    }

    for (const location of SEO_LOCATIONS) {
        routes.push(`/cidade/${location.stateSlug}/${location.citySlug}`);
    }

    return [...new Set(routes)];
}

function cleanHelmetFromTemplate(html) {
    return html
        .replace(/<title>.*?<\/title>\s*/s, '')
        .replace(/\s*<meta name="description"[^>]*>\s*/s, '')
        .replace(/\s*<link rel="canonical"[^>]*>\s*/s, '')
        .replace(/\s*<link rel="alternate"[^>]*>\s*/g, '')
        .replace(/\s*<meta name="robots"[^>]*>\s*/g, '')
        .replace(/\s*<meta property="og:[^"]+"[^>]*>\s*/g, '')
        .replace(/\s*<meta name="twitter:[^"]+"[^>]*>\s*/g, '')
        .replace(/\s*<script type="application\/ld\+json">.*?<\/script>\s*/gs, '');
}

function writeRouteHtml(template, route, rendered) {
    const html = cleanHelmetFromTemplate(template)
        .replace('</head>', `${rendered.headHtml}\n</head>`)
        .replace('<div id="root"></div>', `<div id="root">${rendered.appHtml}</div>`);

    const target = route === '/'
        ? path.join(distDir, 'index.html')
        : path.join(distDir, ...route.split('/').filter(Boolean), 'index.html');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, html, 'utf8');
}

async function main() {
    if (!fs.existsSync(templatePath)) {
        throw new Error('dist/index.html não encontrado. Execute vite build primeiro.');
    }
    if (!fs.existsSync(serverEntryPath)) {
        throw new Error('dist/server/entry-server.js não encontrado. Execute vite build --ssr src/entry-server.tsx primeiro.');
    }

    const template = fs.readFileSync(templatePath, 'utf8');
    const { render } = await import(pathToFileURL(serverEntryPath).href);
    const routes = buildRoutes();

    for (const route of routes) {
        const rendered = await render(route);
        writeRouteHtml(template, route, rendered);
    }

    console.log(`[prerender] ${routes.length} páginas React renderizadas em HTML estático.`);
}

main().catch((error) => {
    console.error('[prerender] falha:', error);
    process.exit(1);
});
