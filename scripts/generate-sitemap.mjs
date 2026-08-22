#!/usr/bin/env node
/**
 * Com `NEXT_PUBLIC_SITE_URL` no `.env`, gera:
 * - `public/sitemap.xml` (+ `dist/` na mesma pasta após build)
 * - `public/robots.txt` (+ `dist/`) apontando o Sitemap para esse domínio
 *
 * Também inclui páginas estáticas, listagens por categoria/subcategoria e `/anuncio/:id`.
 * Mantenha `CATEGORIES` alinhado a `src/app/data/categories.ts`.
 *
 * Env: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
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
    { path: '/sobre', changefreq: 'monthly', priority: '0.7' },
    { path: '/contato', changefreq: 'monthly', priority: '0.6' },
    { path: '/termos', changefreq: 'yearly', priority: '0.4' },
    { path: '/privacidade', changefreq: 'yearly', priority: '0.4' },
    { path: '/dicas-seguranca', changefreq: 'monthly', priority: '0.5' },
    { path: '/mapa-do-site', changefreq: 'monthly', priority: '0.5' },
];

const GUIDE_PATHS = [
    '/guias/como-vender-com-seguranca',
    '/guias/cuidados-ao-comprar-carro-usado',
    '/guias/como-anunciar-imovel',
    '/guias/como-tirar-fotos-para-vender-mais',
];

const SEO_LOCATIONS = [
    // Sudeste
    { stateSlug: 'sp', citySlug: 'sao-paulo' },
    { stateSlug: 'sp', citySlug: 'campinas' },
    { stateSlug: 'sp', citySlug: 'guarulhos' },
    { stateSlug: 'sp', citySlug: 'sao-bernardo-do-campo' },
    { stateSlug: 'sp', citySlug: 'santo-andre' },
    { stateSlug: 'sp', citySlug: 'osasco' },
    { stateSlug: 'sp', citySlug: 'sorocaba' },
    { stateSlug: 'sp', citySlug: 'ribeirao-preto' },
    { stateSlug: 'sp', citySlug: 'sao-jose-dos-campos' },
    { stateSlug: 'sp', citySlug: 'santos' },
    { stateSlug: 'rj', citySlug: 'rio-de-janeiro' },
    { stateSlug: 'rj', citySlug: 'niteroi' },
    { stateSlug: 'rj', citySlug: 'sao-goncalo' },
    { stateSlug: 'rj', citySlug: 'duque-de-caxias' },
    { stateSlug: 'mg', citySlug: 'belo-horizonte' },
    { stateSlug: 'mg', citySlug: 'uberlandia' },
    { stateSlug: 'mg', citySlug: 'contagem' },
    { stateSlug: 'mg', citySlug: 'juiz-de-fora' },
    { stateSlug: 'es', citySlug: 'vitoria' },
    { stateSlug: 'es', citySlug: 'vila-velha' },

    // Sul
    { stateSlug: 'pr', citySlug: 'curitiba' },
    { stateSlug: 'pr', citySlug: 'londrina' },
    { stateSlug: 'pr', citySlug: 'maringa' },
    { stateSlug: 'sc', citySlug: 'florianopolis' },
    { stateSlug: 'sc', citySlug: 'joinville' },
    { stateSlug: 'sc', citySlug: 'blumenau' },
    { stateSlug: 'rs', citySlug: 'porto-alegre' },
    { stateSlug: 'rs', citySlug: 'caxias-do-sul' },

    // Centro-Oeste
    { stateSlug: 'df', citySlug: 'brasilia' },
    { stateSlug: 'go', citySlug: 'goiania' },
    { stateSlug: 'go', citySlug: 'anapolis' },
    { stateSlug: 'mt', citySlug: 'cuiaba' },
    { stateSlug: 'ms', citySlug: 'campo-grande' },

    // Nordeste
    { stateSlug: 'ba', citySlug: 'salvador' },
    { stateSlug: 'ba', citySlug: 'feira-de-santana' },
    { stateSlug: 'pe', citySlug: 'recife' },
    { stateSlug: 'ce', citySlug: 'fortaleza' },
    { stateSlug: 'rn', citySlug: 'natal' },
    { stateSlug: 'pb', citySlug: 'joao-pessoa' },
    { stateSlug: 'al', citySlug: 'maceio' },
    { stateSlug: 'se', citySlug: 'aracaju' },
    { stateSlug: 'pi', citySlug: 'teresina' },
    { stateSlug: 'ma', citySlug: 'sao-luis' },

    // Norte
    { stateSlug: 'pa', citySlug: 'belem' },
    { stateSlug: 'am', citySlug: 'manaus' },
    { stateSlug: 'ro', citySlug: 'porto-velho' },
    { stateSlug: 'ac', citySlug: 'rio-branco' },
    { stateSlug: 'ap', citySlug: 'macapa' },
    { stateSlug: 'rr', citySlug: 'boa-vista' },
    { stateSlug: 'to', citySlug: 'palmas' },
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

function toIsoDate(value) {
    if (!value) return '';
    const time = new Date(value);
    if (Number.isNaN(time.getTime())) return '';
    return time.toISOString();
}

function errorMessage(error) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object') {
        return JSON.stringify(error);
    }
    return String(error);
}

async function fetchAllAdsForSitemap() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL' || !supabaseKey) {
        console.warn('[sitemap] Variáveis Supabase ausentes — pulando URLs de anúncios.');
        return [];
    }

    try {
        const client = createClient(supabaseUrl, supabaseKey);
        return await fetchAdsWithQuery(client, 'id, status, created_at, updated_at', true);
    } catch (err) {
        try {
            const client = createClient(supabaseUrl, supabaseKey);
            return await fetchAdsWithQuery(client, 'id, status', true);
        } catch (statusErr) {
            const statusMessage = errorMessage(statusErr);
            console.warn(`[sitemap] Consulta de anúncios ativos falhou (${statusMessage}) — tentando fallback sem status.`);
            try {
                const client = createClient(supabaseUrl, supabaseKey);
                return await fetchAdsWithQuery(client, 'id', false);
            } catch (fallbackErr) {
                const fallbackMessage = errorMessage(fallbackErr);
                console.warn(`[sitemap] Não foi possível buscar anúncios agora (${fallbackMessage}) — gerando sitemap sem URLs de anúncios.`);
                return [];
            }
        }
    }
}

async function fetchAdsWithQuery(client, selectColumns, activeOnly) {
        const ads = [];
        const pageSize = 1000;
        let from = 0;
        for (;;) {
            let query = client
                .from('ads')
                .select(selectColumns)
                .range(from, from + pageSize - 1);
            if (activeOnly) query = query.eq('status', 'active');
            const { data, error } = await query;
            if (error) throw error;
            if (!data?.length) break;
            ads.push(
                ...data.map((r) => ({
                    id: r.id,
                    lastmod: toIsoDate(r.updated_at || r.created_at),
                })),
            );
            if (data.length < pageSize) break;
            from += pageSize;
        }
        return ads;
}

function buildXml(entries) {
    const body = entries
        .map((e) => {
            const lines = [
                '  <url>',
                `    <loc>${escapeXml(e.loc)}</loc>`,
            ];
            if (e.lastmod) lines.push(`    <lastmod>${escapeXml(e.lastmod)}</lastmod>`);
            lines.push(
                `    <changefreq>${escapeXml(e.changefreq)}</changefreq>`,
                `    <priority>${escapeXml(e.priority)}</priority>`,
                '  </url>',
            );
            return lines.join('\n');
        })
        .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

async function fetchAllBusinessesForSitemap() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL' || !supabaseKey) {
        return [];
    }

    try {
        const client = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await client
            .from('businesses')
            .select('slug, updated_at, created_at')
            .eq('is_active', true)
            .limit(1000);
        if (error || !data) return [];
        return data.map((b) => ({
            slug: b.slug,
            lastmod: toIsoDate(b.updated_at || b.created_at),
        }));
    } catch {
        return [];
    }
}

async function main() {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.VITE_SITE_URL || 'https://dezzapego.com').replace(/\/$/, '');
    const entries = [];

    for (const s of STATIC_PATHS) {
        entries.push({
            loc: `${siteUrl}${s.path}`,
            changefreq: s.changefreq,
            priority: s.priority,
        });
    }

    for (const guidePath of GUIDE_PATHS) {
        entries.push({
            loc: `${siteUrl}${guidePath}`,
            changefreq: 'monthly',
            priority: '0.65',
        });
    }

    for (const cat of Object.keys(CATEGORIES)) {
        const categorySlug = slugifyCategoryPart(cat);
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

        for (const location of SEO_LOCATIONS) {
            entries.push({
                loc: `${siteUrl}/cidade/${location.stateSlug}/${location.citySlug}/${categorySlug}`,
                changefreq: 'daily',
                priority: '0.6',
            });
        }
    }

    for (const location of SEO_LOCATIONS) {
        entries.push({
            loc: `${siteUrl}/cidade/${location.stateSlug}/${location.citySlug}`,
            changefreq: 'daily',
            priority: '0.65',
        });
    }

    const businesses = await fetchAllBusinessesForSitemap();
    for (const b of businesses) {
        if (b.slug) {
            entries.push({
                loc: `${siteUrl}/empresa/${b.slug}`,
                lastmod: b.lastmod,
                changefreq: 'weekly',
                priority: '0.75',
            });
        }
    }

    const ads = await fetchAllAdsForSitemap();
    for (const ad of ads) {
        entries.push({
            loc: `${siteUrl}/anuncio/${ad.id}`,
            lastmod: ad.lastmod,
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
        '# Gerado por npm run generate:sitemap — domínio em NEXT_PUBLIC_SITE_URL',
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /admin/',
        'Disallow: /dashboard',
        'Disallow: /dashboard/',
        'Disallow: /meus-anuncios',
        'Disallow: /meus-anuncios/',
        'Disallow: /favoritos',
        'Disallow: /favoritos/',
        'Disallow: /checkout/',
        'Disallow: /redefinir-senha',
        'Disallow: /conta-suspensa',
        'Disallow: /api/',
        'Disallow: /*?*details=*',
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
