import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import App from '@/app/App';
import { buildAdJsonLd, buildAdMetadata, fetchAdForSeo } from '@/lib/serverAdSeo';

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const ad = await fetchAdForSeo(id);
  return buildAdMetadata(ad, id);
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const ad = await fetchAdForSeo(id);
  if (!ad) {
    notFound();
  }
  const path = `/anuncio/${id}`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildAdJsonLd(ad, id)) }}
      />
      <Suspense>
        <App initialPath={path} enableHelmet={false} />
      </Suspense>
    </>
  );
}
