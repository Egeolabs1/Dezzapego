#!/usr/bin/env node
/**
 * Com `VITE_SITE_URL` no `.env`, gera:
 * - `public/sitemap.xml` (+ `dist/` na mesma pasta após build)
 * - `public/robots.txt` (+ `dist/`) apontando o Sitemap para esse domínio
 *
 * Também inclui páginas estáticas, listagens por categoria/subcategoria e `/anuncio/:id`.
 * Mantenha `CATEGORIES` alinhado a `src/app/data/categories.ts`.
 *
 * Env: `VITE_SITE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadDotEnv() {
    const envPath = path.join(root, '.env');
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const eq = t.indexOf('=');
        if (eq === -1) continue;
        const key = t.slice(0, eq).trim();
        let val = t.slice(eq + 1).trim();
        if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
        ) {
            val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = val;
    }
}

loadDotEnv();

/** @type {Record<string, string[]>} — igual a `CATEGORIES` em src/app/data/categories.ts */
const CATEGORIES = {
    Imóveis: [
        'Venda - casas e apartamentos',
        'Aluguel - casas e apartamentos',
        'Temporada',
        'Terrenos, sítios e fazendas',
        'Comércio e indústria',
        'Lançamento',
    ],
    'Autos e Peças': [
        'Carros, Vans e Utilitários',
        'Motos',
        'Caminhões e Ônibus',
        'Barcos e Aeronaves',
        'Peças e Acessórios',
    ],
    'Para a sua Casa': [
        'Móveis',
        'Eletrodomésticos',
        'Materiais de Construção',
        'Jardim e Agricultura',
        'Utensílios Domésticos',
        'Decoração',
        'Cama, Mesa e Banho',
    ],
    'Eletrônicos e Celulares': [
        'Celulares e Telefonia',
        'Computadores e Acessórios',
        'Videogames',
        'TV e Vídeo',
        'Áudio',
        'Câmeras e Drones',
    ],
    'Música e Hobbies': [
        'Instrumentos Musicais',
        'Livros e Revistas',
        'Filmes e Música',
        'Coleções',
        'Artes e Antiguidades',
        'Brinquedos e Jogos',
    ],
    'Esportes e Lazer': ['Esportes e Ginástica', 'Ciclismo', 'Camping e Pesca', 'Skate e Patins'],
    'Moda e Beleza': [
        'Roupas e Calçados',
        'Bolsas, Malas e Mochilas',
        'Beleza e Saúde',
        'Acessórios',
        'Artigos Infantis',
    ],
    'Agro e Indústria': ['Animais de Fazenda', 'Maquinaria Agrícola', 'Comércio e Escritório', 'Equipamentos Industriais'],
    Serviços: [
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
        'Outros',
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
        'Outros',
    ],
};

const STATIC_PATHS = [
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/planos', changefreq: 'weekly', priority: '0.8' },
    { path: '/contato', changefreq: 'monthly', priority: '0.6' },
    { path: '/termos', changefreq: 'yearly', priority: '0.4' },
    { path: '/privacidade', changefreq: 'yearly', priority: '0.4' },
    { path: '/dicas-seguranca', changefreq: 'monthly', priority: '0.5' },
    { path: '/mapa-do-site', changefreq: 'monthly', priority: '0.5' },
];

function escapeXml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function slugifyCategoryPart(value) {
    return String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/&/g, ' e ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function categoryPath(category, subcategory) {
    const categorySlug = slugifyCategoryPart(category);
    if (!subcategory) return `/categoria/${categorySlug}`;
    return `/categoria/${categorySlug}/${slugifyCategoryPart(subcategory)}`;
}

async function fetchAllAdIds() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL' || !supabaseKey) {
        console.warn('[sitemap] Variáveis Supabase ausentes — pulando URLs de anúncios.');
        return [];
    }

    try {
        const client = createClient(supabaseUrl, supabaseKey);
        const ids = [];
        const pageSize = 1000;
        let from = 0;
        for (;;) {
            const { data, error } = await client.from('ads').select('id').range(from, from + pageSize - 1);
            if (error) throw error;
            if (!data?.length) break;
            ids.push(...data.map((r) => r.id));
            if (data.length < pageSize) break;
            from += pageSize;
        }
        return ids;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[sitemap] Não foi possível buscar anúncios agora (${message}) — gerando sitemap sem URLs de anúncios.`);
        return [];
    }
}

function buildXml(entries) {
    const body = entries
        .map(
            (e) => `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    <changefreq>${escapeXml(e.changefreq)}</changefreq>
    <priority>${escapeXml(e.priority)}</priority>
  </url>`
        )
        .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

async function main() {
    const siteUrl = (process.env.VITE_SITE_URL || 'https://dezzapego.com').replace(/\/$/, '');
    const entries = [];

    for (const s of STATIC_PATHS) {
        entries.push({
            loc: `${siteUrl}${s.path}`,
            changefreq: s.changefreq,
            priority: s.priority,
        });
    }

    for (const cat of Object.keys(CATEGORIES)) {
        entries.push({
            loc: `${siteUrl}${categoryPath(cat)}`,
            changefreq: 'daily',
            priority: '0.7',
        });
        for (const sub of CATEGORIES[cat]) {
            entries.push({
                loc: `${siteUrl}${categoryPath(cat, sub)}`,
                changefreq: 'daily',
                priority: '0.65',
            });
        }
    }

    const adIds = await fetchAllAdIds();
    for (const id of adIds) {
        entries.push({
            loc: `${siteUrl}/anuncio/${id}`,
            changefreq: 'weekly',
            priority: '0.8',
        });
    }

    const xml = buildXml(entries);

    const outPublic = path.join(root, 'public', 'sitemap.xml');
    fs.mkdirSync(path.dirname(outPublic), { recursive: true });
    fs.writeFileSync(outPublic, xml, 'utf8');
    console.log('[sitemap]', outPublic, `— ${entries.length} URLs`);

    const outDist = path.join(root, 'dist', 'sitemap.xml');
    if (fs.existsSync(path.dirname(outDist))) {
        fs.writeFileSync(outDist, xml, 'utf8');
        console.log('[sitemap]', outDist, `— ${entries.length} URLs`);
    }

    writeRobotsTxt(siteUrl);
}

function writeRobotsTxt(siteUrl) {
    const lines = [
        '# Gerado por npm run generate:sitemap — domínio em VITE_SITE_URL',
        'User-agent: *',
        'Allow: /',
        '',
        `Sitemap: ${siteUrl}/sitemap.xml`,
        '',
    ];
    const body = lines.join('\n');

    const pub = path.join(root, 'public', 'robots.txt');
    fs.writeFileSync(pub, body, 'utf8');
    console.log('[robots]', pub);

    const dst = path.join(root, 'dist', 'robots.txt');
    if (fs.existsSync(path.dirname(dst))) {
        fs.writeFileSync(dst, body, 'utf8');
        console.log('[robots]', dst);
    }
}

main().catch((err) => {
    console.error('[sitemap] falha:', err);
    process.exit(1);
});
