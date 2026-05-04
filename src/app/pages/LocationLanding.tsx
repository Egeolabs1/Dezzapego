import { Link, Navigate, useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import SEO from '../../components/SEO';
import { categoriesData } from '../data/categories';
import { buildLocationStructuredData } from '../../lib/categorySeo';
import { getSeoLocation } from '../../lib/seoContent';
import { getCategoryPath, resolveCategoryFromSlug } from '../../lib/categoryRoutes';
import { toAbsoluteUrl } from '../../lib/seo';

export default function LocationLanding() {
    const { stateSlug, citySlug, categorySlug } = useParams();
    const location = getSeoLocation(stateSlug, citySlug);
    const category = resolveCategoryFromSlug(categorySlug);

    if (!location) return <Navigate to="/" replace />;
    if (categorySlug && !category) return <Navigate to={`/cidade/${stateSlug}/${citySlug}`} replace />;

    const path = category
        ? `/cidade/${location.stateSlug}/${location.citySlug}/${categorySlug}`
        : `/cidade/${location.stateSlug}/${location.citySlug}`;
    const canonicalUrl = toAbsoluteUrl(path);
    const listingSearch = new URLSearchParams({
        state: location.state,
        city: location.city,
        ...(category ? { category } : {}),
    }).toString();

    const title = category
        ? `${category} em ${location.city}, ${location.state}`
        : `Classificados em ${location.city}, ${location.state}`;
    const description = category
        ? `Encontre anúncios de ${category} em ${location.city}, ${location.state}. Veja ofertas locais e publique grátis no Dezzapego.`
        : `Classificados locais em ${location.city}, ${location.state}: imóveis, veículos, eletrônicos, serviços e mais no Dezzapego.`;

    return (
        <div className="min-h-screen bg-gray-50">
            <SEO
                title={title}
                description={description}
                keywords={[location.city, location.state, category || 'classificados', 'anúncios locais']}
                canonicalUrl={canonicalUrl}
                structuredData={buildLocationStructuredData({
                    title,
                    description,
                    path,
                    city: location.city,
                    state: location.state,
                })}
            />
            <Header selectedState={location.state} selectedCity={location.city} />

            <main className="container mx-auto max-w-5xl px-4 py-10">
                <div className="mb-8">
                    <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Busca local</p>
                    <h1 className="mt-2 text-3xl font-bold text-gray-900 md:text-4xl">{title}</h1>
                    <p className="mt-4 max-w-3xl text-lg leading-relaxed text-gray-600">{description}</p>
                    <Link
                        to={`/${listingSearch ? `?${listingSearch}` : ''}`}
                        className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                        Ver anúncios filtrados
                    </Link>
                </div>

                <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900">
                        {category ? `Outras buscas em ${location.city}` : `Categorias em ${location.city}`}
                    </h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {categoriesData.map((item) => (
                            <Link
                                key={item.id}
                                to={`/cidade/${location.stateSlug}/${location.citySlug}/${getCategoryPath(item.id).replace('/categoria/', '')}`}
                                className="rounded-lg border border-gray-100 p-4 text-sm font-semibold text-gray-800 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            >
                                {item.name} em {location.city}
                            </Link>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
