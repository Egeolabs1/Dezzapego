import type { Metadata, Viewport } from 'next';
import { PUBLIC_ENV } from '@/lib/publicEnv';
import { getDefaultShareImagePath, getSiteOrigin, SITE_NAME, toAbsoluteUrl } from '@/lib/seo';
import '../src/styles/index.css';


const origin = getSiteOrigin();
const defaultTitle = 'Dezzapego | Compre e Venda Grátis no Brasil — Imóveis, Carros e Mais';
const defaultDescription =
  'Compre e venda de tudo no Dezzapego: imóveis, carros, eletrônicos, móveis, agro e serviços. Milhares de ofertas perto de você. Publique seu anúncio 100% grátis.';
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
    default: defaultTitle,
    template: `%s | ${SITE_NAME}`,
  },
  description: defaultDescription,
  keywords: [
    'classificados',
    'anúncios grátis',
    'comprar e vender',
    'imóveis',
    'carros usados',
    'celulares usados',
    'móveis usados',
    'desapegar',
    'Dezzapego',
  ],
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
    title: defaultTitle,
    description: defaultDescription,
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
    title: defaultTitle,
    description: defaultDescription,
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
      <head>
      </head>
      <body>{children}</body>
    </html>



  );
}
