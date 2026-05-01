import { Helmet } from 'react-helmet-async';
import { getSiteOrigin, toAbsoluteUrl, SITE_NAME, getDefaultShareImagePath } from '../lib/seo';

interface SEOProps {
    title: string;
    description?: string;
    /** Nome da marca no sufixo do <title>; padrão Dezzapego */
    siteName?: string;
    /** Open Graph type */
    type?: 'website' | 'article' | 'product';
    /** Imagem (absoluta ou path /public). Sempre emitida como URL absoluta quando possível */
    image?: string;
    /** URL canônica da página — padrão: origem + pathname atual em browser */
    url?: string;
    /** Canonical explícita (opcional); se omitida usa `url` */
    canonicalUrl?: string;
    /** Keywords opcionais (evite spam; liste termos relevantes) */
    keywords?: string[];
    /** Não indexar (login, páginas de conta, etc.) */
    noIndex?: boolean;
    structuredData?: Record<string, unknown> | Record<string, unknown>[];
    /** Override apenas para compartilhamento social */
    ogTitle?: string;
    /** Override apenas para descrição de compartilhamento social */
    ogDescription?: string;
}

const DEFAULT_DESCRIPTION =
    'Compre e venda no Dezzapego: classificados de imóveis, carros, eletrônicos e muito mais. Anúncios com segurança e filtros por categoria.';

export default function SEO({
    title,
    description = DEFAULT_DESCRIPTION,
    siteName = SITE_NAME,
    type = 'website',
    image = getDefaultShareImagePath(),
    url,
    canonicalUrl,
    keywords,
    noIndex = false,
    structuredData,
    ogTitle,
    ogDescription,
}: SEOProps) {
    const origin = getSiteOrigin();
    const pathname = typeof window !== 'undefined' ? window.location.pathname || '/' : '/';
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const resolvedUrl = url
        ? /^https?:\/\//i.test(url)
            ? url
            : toAbsoluteUrl(url)
        : `${origin}${pathname}${search}`;
    const absoluteImage = toAbsoluteUrl(image);
    /** Canonical sem query por padrão — evita duplicar index em URLs com filtros */
    const canonical =
        canonicalUrl != null ? toAbsoluteUrl(canonicalUrl) : `${origin}${pathname}`;
    const fullTitle = `${title} | ${siteName}`;
    const shareTitle = ogTitle || fullTitle;
    const shareDescription = ogDescription || description;
    const ogType = type === 'product' ? 'product' : type === 'article' ? 'article' : 'website';
    const useLargeTwitterCard =
        type === 'article' ||
        type === 'product' ||
        (absoluteImage && !absoluteImage.endsWith('.svg'));
    const ogImageWidth = import.meta.env.VITE_OG_IMAGE_WIDTH || (absoluteImage.endsWith('/og-default.png') ? '1200' : '');
    const ogImageHeight = import.meta.env.VITE_OG_IMAGE_HEIGHT || (absoluteImage.endsWith('/og-default.png') ? '630' : '');

    const robotsContent = noIndex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

    const structuredScripts = structuredData
        ? Array.isArray(structuredData)
            ? structuredData
            : [structuredData]
        : [];

    return (
        <Helmet>
            <html lang="pt-BR" />
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <meta name="robots" content={robotsContent} />
            {keywords && keywords.length > 0 ? (
                <meta name="keywords" content={keywords.join(', ')} />
            ) : null}

            <link rel="canonical" href={canonical} />
            <link rel="alternate" hrefLang="pt-BR" href={canonical} />
            <link rel="alternate" hrefLang="x-default" href={canonical} />

            {import.meta.env.VITE_GOOGLE_SITE_VERIFICATION ? (
                <meta
                    name="google-site-verification"
                    content={import.meta.env.VITE_GOOGLE_SITE_VERIFICATION}
                />
            ) : null}

            <meta property="og:locale" content="pt_BR" />
            <meta property="og:site_name" content={siteName} />
            <meta property="og:type" content={ogType} />
            <meta property="og:title" content={shareTitle} />
            <meta property="og:description" content={shareDescription} />
            <meta property="og:image" content={absoluteImage} />
            <meta property="og:image:alt" content={title} />
            {ogImageWidth ? (
                <meta property="og:image:width" content={ogImageWidth} />
            ) : null}
            {ogImageHeight ? (
                <meta property="og:image:height" content={ogImageHeight} />
            ) : null}
            <meta property="og:url" content={resolvedUrl} />

            <meta name="twitter:card" content={useLargeTwitterCard ? 'summary_large_image' : 'summary'} />
            <meta name="twitter:title" content={shareTitle} />
            <meta name="twitter:description" content={shareDescription} />
            <meta name="twitter:image" content={absoluteImage} />

            {structuredScripts.map((data, idx) => (
                <script key={idx} type="application/ld+json">
                    {JSON.stringify(data)}
                </script>
            ))}
        </Helmet>
    );
}
