import type { Metadata, Viewport } from 'next';
import { PUBLIC_ENV } from '@/lib/publicEnv';
import { getDefaultShareImagePath, getSiteOrigin, SITE_NAME, toAbsoluteUrl } from '@/lib/seo';
import '@/styles/index.css';

const origin = getSiteOrigin();
const defaultTitle = 'Classificados e anúncios grátis no Brasil';
const defaultDescription =
  'Anúncios de imóveis, veículos, eletrônicos, agro e mais. Filtre por cidade, categoria e preço. Publique grátis no Dezzapego.';
const defaultImage = toAbsoluteUrl(getDefaultShareImagePath());

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
};

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  applicationName: SITE_NAME,
  title: {
    default: `${defaultTitle} | ${SITE_NAME}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: defaultDescription,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },

  alternates: {
    canonical: '/',
    languages: {
      'pt-BR': '/',
      'x-default': '/',
    },
  },
  openGraph: {
    locale: 'pt_BR',
    siteName: SITE_NAME,
    type: 'website',
    title: SITE_NAME,
    description: 'Imóveis, carros, eletrônicos e mais. Publique anúncios grátis no Dezzapego.',
    url: '/',
    images: [
      {
        url: defaultImage,
        width: 1200,
        height: 630,
        alt: defaultTitle,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: 'Imóveis, carros, eletrônicos e mais. Publique anúncios grátis no Dezzapego.',
    images: [defaultImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  verification: PUBLIC_ENV.GOOGLE_SITE_VERIFICATION
    ? {
        google: PUBLIC_ENV.GOOGLE_SITE_VERIFICATION,
      }
    : undefined,
  other: PUBLIC_ENV.ADSENSE_CLIENT
    ? {
        'google-adsense-account': PUBLIC_ENV.ADSENSE_CLIENT,
      }
    : undefined,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>

      <head />
      <body>{children}</body>
    </html>

  );
}
