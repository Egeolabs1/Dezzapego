import type { Metadata } from 'next';
import { Suspense } from 'react';
import App from '@/app/App';
import {
  buildWebPageStructuredData,
} from '@/lib/categorySeo';


export const metadata: Metadata = {
  title: 'Dezzapego | Compre e Venda Grátis no Brasil — Imóveis, Carros e Mais',
  description:
    'Compre e venda de tudo no Dezzapego: imóveis, carros, eletrônicos, móveis, agro e serviços. Encontre ofertas perto de você ou publique seu anúncio 100% grátis.',
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
              title: 'Dezzapego | Compre e Venda Grátis no Brasil — Imóveis, Carros e Mais',
              description:
                'Compre e venda de tudo no Dezzapego: imóveis, carros, eletrônicos, móveis, agro e serviços. Encontre ofertas perto de você ou publique seu anúncio 100% grátis.',
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
