import type { Metadata } from 'next';
import { Suspense } from 'react';
import App from '@/app/App';
import {
  buildWebPageStructuredData,
} from '@/lib/categorySeo';
import { SITE_NAME } from '@/lib/seo';


export const metadata: Metadata = {
  title: `Classificados e anúncios grátis no Brasil | ${SITE_NAME}`,
  description: 'Anúncios de imóveis, veículos, eletrônicos, agro e mais. Filtre por cidade, categoria e preço. Publique grátis no Dezzapego.',
};

export default function Page() {
  const path = '/';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildWebPageStructuredData({
              title: 'Classificados e anúncios grátis no Brasil',
              description:
                'Anúncios de imóveis, veículos, eletrônicos, agro e mais. Filtre por cidade, categoria e preço. Publique grátis no Dezzapego.',
              path,
            })
          ),
        }}
      />
      <Suspense>
        <App initialPath={path} enableHelmet={false} />
      </Suspense>
    </>
  );
}
