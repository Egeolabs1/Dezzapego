import { useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '../components/Header';
import SEO from '../../components/SEO';
import { buildArticleStructuredData } from '../../lib/categorySeo';
import { getSeoGuide, SEO_GUIDES } from '../../lib/seoContent';
import { toAbsoluteUrl } from '../../lib/seo';

export default function GuidePage() {
    const { guideSlug } = useParams() as { guideSlug: string };
    const router = useRouter();
    const guide = getSeoGuide(guideSlug);

    useEffect(() => {
        if (!guide) {
            router.replace('/guias/como-vender-com-seguranca');
        }
    }, [guide, router]);

    if (!guide) return null;

    const canonicalUrl = toAbsoluteUrl(`/guias/${guide.slug}`);

    return (
        <div className="min-h-screen bg-gray-50">
            <SEO
                title={guide.title}
                description={guide.description}
                keywords={guide.keywords}
                canonicalUrl={canonicalUrl}
                type="article"
                structuredData={buildArticleStructuredData({
                    title: guide.title,
                    description: guide.description,
                    path: `/guias/${guide.slug}`,
                })}
            />
            <Header />

            <main className="container mx-auto max-w-4xl px-4 py-10">
                <div className="mb-8">
                    <Link href="/mapa-do-site" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                        Guias do Dezzapego
                    </Link>
                    <h1 className="mt-3 text-3xl font-bold leading-tight text-gray-900 md:text-4xl">{guide.title}</h1>
                    <p className="mt-4 text-lg leading-relaxed text-gray-600">{guide.intro}</p>
                </div>

                <article className="space-y-6 rounded-lg border border-gray-100 bg-white p-6 shadow-sm md:p-8">
                    {guide.sections.map((section) => (
                        <section key={section.heading}>
                            <h2 className="text-xl font-bold text-gray-900">{section.heading}</h2>
                            <p className="mt-3 leading-relaxed text-gray-600">{section.body}</p>
                        </section>
                    ))}
                </article>

                <section className="mt-8">
                    <h2 className="text-lg font-bold text-gray-900">Outros guias úteis</h2>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {SEO_GUIDES.filter((item) => item.slug !== guide.slug).map((item) => (
                            <Link
                                key={item.slug}
                                href={`/guias/${item.slug}`}
                                className="rounded-lg border border-gray-100 bg-white p-4 text-sm font-semibold text-gray-800 shadow-sm hover:border-blue-200 hover:text-blue-700"
                            >
                                {item.title}
                            </Link>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
