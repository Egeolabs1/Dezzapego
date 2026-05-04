export const PUBLIC_ENV = {
    SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || process.env.VITE_SITE_URL || '',
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    OG_IMAGE: process.env.NEXT_PUBLIC_OG_IMAGE || process.env.VITE_OG_IMAGE || '',
    OG_IMAGE_WIDTH: process.env.NEXT_PUBLIC_OG_IMAGE_WIDTH || process.env.VITE_OG_IMAGE_WIDTH || '',
    OG_IMAGE_HEIGHT: process.env.NEXT_PUBLIC_OG_IMAGE_HEIGHT || process.env.VITE_OG_IMAGE_HEIGHT || '',
    GOOGLE_SITE_VERIFICATION:
        process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
        process.env.VITE_GOOGLE_SITE_VERIFICATION ||
        '',
    ORG_LOGO_URL: process.env.NEXT_PUBLIC_ORG_LOGO_URL || process.env.VITE_ORG_LOGO_URL || '',
    ORG_SAME_AS: process.env.NEXT_PUBLIC_ORG_SAME_AS || process.env.VITE_ORG_SAME_AS || '',
    ADSENSE_CLIENT: process.env.NEXT_PUBLIC_ADSENSE_CLIENT || process.env.VITE_ADSENSE_CLIENT || '',
    ADSENSE_HOME_TOP_SLOT:
        process.env.NEXT_PUBLIC_ADSENSE_HOME_TOP_SLOT ||
        process.env.VITE_ADSENSE_HOME_TOP_SLOT ||
        '',
    ADSENSE_HOME_MOBILE_SLOT:
        process.env.NEXT_PUBLIC_ADSENSE_HOME_MOBILE_SLOT ||
        process.env.VITE_ADSENSE_HOME_MOBILE_SLOT ||
        '',
    ADSENSE_AD_DETAIL_TOP_SLOT:
        process.env.NEXT_PUBLIC_ADSENSE_AD_DETAIL_TOP_SLOT ||
        process.env.VITE_ADSENSE_AD_DETAIL_TOP_SLOT ||
        '',
    ADSENSE_TEST_MODE:
        process.env.NEXT_PUBLIC_ADSENSE_TEST_MODE || process.env.VITE_ADSENSE_TEST_MODE || '',
    TURNSTILE_SITE_KEY:
        process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
        process.env.VITE_TURNSTILE_SITE_KEY ||
        '',
};

export function isPublicDevMode() {
    return process.env.NODE_ENV !== 'production';
}
