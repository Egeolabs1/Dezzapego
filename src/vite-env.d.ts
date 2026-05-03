/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly VITE_SITE_URL?: string
    /** Imagem Open Graph (ex.: /og-1200x630.png), preferir 1200×630px */
    readonly VITE_OG_IMAGE?: string
    readonly VITE_OG_IMAGE_WIDTH?: string
    readonly VITE_OG_IMAGE_HEIGHT?: string
    /** URL do logo para JSON-LD Organization (padrão /icon.svg) */
    readonly VITE_ORG_LOGO_URL?: string
    /** Perfis separados por vírgula: Facebook, Instagram, etc. */
    readonly VITE_ORG_SAME_AS?: string
    /** Meta tag google-site-verification (Search Console) */
    readonly VITE_GOOGLE_SITE_VERIFICATION?: string
    readonly VITE_ADSENSE_CLIENT?: string
    readonly VITE_ADSENSE_HOME_TOP_SLOT?: string
    readonly VITE_ADSENSE_HOME_MOBILE_SLOT?: string
    readonly VITE_ADSENSE_AD_DETAIL_TOP_SLOT?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

interface TurnstileRenderOptions {
    sitekey: string
    callback?: (token: string) => void
    'error-callback'?: () => void
}

interface Turnstile {
    render: (container: HTMLElement, options: TurnstileRenderOptions) => string
    remove: (widgetId: string) => void
    reset: (widgetId?: string) => void
}

interface Window {
    turnstile?: Turnstile
}
