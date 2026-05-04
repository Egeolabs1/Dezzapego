import { lazy, Suspense, useMemo, useState, useEffect } from 'react';
import { formatPrice } from '../../lib/formatters';

import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { useFilter } from '../contexts/FilterContext';
import { AdSenseSlot } from '../components/AdSenseSlot';
import type { Ad } from '../../types';
import { useFavorites } from '../hooks/useFavorites';


import SEO from '../../components/SEO';
import { toAbsoluteUrl } from '../../lib/seo';
import {
    buildWebsiteStructuredData,
    buildListingStructuredData,
    getListingSeoForHome,
} from '../../lib/categorySeo';
import {
    getCategoryPath,
    resolveCategoryFromSlug,
    resolveSubcategoryFromSlug,
} from '../../lib/categoryRoutes';
import { decodeDetailsFilters, encodeDetailsFilters } from '../../lib/marketplaceQuality';

const Categories = lazy(() => import('../components/Categories').then((module) => ({ default: module.Categories })));
const Filters = lazy(() => import('../components/Filters').then((module) => ({ default: module.Filters })));
const AdsList = lazy(() => import('../components/AdsList').then((module) => ({ default: module.AdsList })));
const AdDetails = lazy(() => import('../components/AdDetails').then((module) => ({ default: module.AdDetails })));

function SectionFallback({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse rounded-xl bg-gray-100 ${className}`} />;
}

export default function Home() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { categorySlug, subcategorySlug } = useParams();
    const { searchQuery, setSearchQuery } = useFilter();
    const categoryFromRoute = resolveCategoryFromSlug(categorySlug);
    const subcategoryFromRoute = resolveSubcategoryFromSlug(categoryFromRoute, subcategorySlug);

    // Derived state from URL
    const selectedCategory = categoryFromRoute || searchParams.get('category') || '';
    const selectedSubcategory = subcategoryFromRoute || searchParams.get('subcategory') || '';
    const selectedTransactionType = (searchParams.get('type') as 'venda' | 'aluguel' | '') || '';
    const selectedState = searchParams.get('state') || '';
    const selectedCity = searchParams.get('city') || '';
    const advertiserType = (searchParams.get('advertiserType') as 'ambos' | 'particular' | 'profissional') || 'ambos';
    const sortBy = (searchParams.get('sortBy') as 'relevancia' | 'recentes' | 'menor-preco' | 'maior-preco') || 'relevancia';

    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : 0;
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : 10000000;
    const priceRange: [number, number] = [minPrice, maxPrice];

    const radius = searchParams.get('radius') ? Number(searchParams.get('radius')) : 0;

    const [detailsFilters, setDetailsFilters] = useState<Record<string, any>>(() => decodeDetailsFilters(searchParams.get('details')));
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    // Sync context with URL on mount
    useEffect(() => {
        const q = searchParams.get('q');
        if (q && q !== searchQuery) {
            setSearchQuery(q);
        }
    }, []);

    // Sync URL with context (with debounce)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery !== (searchParams.get('q') || '')) {
                updateSearchParams({ q: searchQuery });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const next = encodeDetailsFilters(detailsFilters);
            if (next !== (searchParams.get('details') || '')) {
                updateSearchParams({ details: next });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [detailsFilters, searchParams]);

    const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
    const { favorites, toggleFavorite } = useFavorites();

    const listingSeo = useMemo(
        () =>
            getListingSeoForHome({
                category: selectedCategory,
                subcategory: selectedSubcategory,
                transactionType: selectedTransactionType,
                searchQuery,
            }),
        [selectedCategory, selectedSubcategory, selectedTransactionType, searchQuery]
    );

    const listingStructuredData = useMemo(() => {
        const q = searchQuery.trim();
        if (!selectedCategory || q) {
            return buildWebsiteStructuredData();
        }
        return buildListingStructuredData({
            category: selectedCategory,
            subcategory: selectedSubcategory || undefined,
        });
    }, [selectedCategory, selectedSubcategory, searchQuery]);

    const updateSearchParams = (updates: Record<string, string | null>) => {
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            Object.entries(updates).forEach(([key, value]) => {
                if (value === null || value === '') {
                    newParams.delete(key);
                } else {
                    newParams.set(key, value);
                }
            });
            return newParams;
        });
    };

    const navigateToListing = (category: string, subcategory?: string, resetType = false) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('category');
        newParams.delete('subcategory');
        if (resetType) newParams.delete('type');

        const qs = newParams.toString();
        const path = category ? getCategoryPath(category, subcategory) : '/';
        navigate(`${path}${qs ? `?${qs}` : ''}`);
    };

    const handleCategorySelect = (category: string) => {
        navigateToListing(category, undefined, true);
        setDetailsFilters({});
    };

    const handleSubcategorySelect = (subcategory: string) => {
        navigateToListing(selectedCategory, subcategory);
    };

    const handleTransactionTypeSelect = (type: string) => {
        updateSearchParams({ type });
    };



    const handlePriceRangeChange = (range: [number, number]) => {
        updateSearchParams({
            minPrice: range[0].toString(),
            maxPrice: range[1].toString()
        });
    };

    const handleRadiusChange = (newRadius: number) => {
        updateSearchParams({ radius: newRadius.toString() });
    };

    const handleHeaderLocationChange = (state: string, city: string) => {
        if (!state) {
            updateSearchParams({ state: null, city: null });
            return;
        }
        updateSearchParams({ state, city });
    };

    // Handle deep linking to specific ad if ID is in URL (optional, can be added later)
    // For now, checks existing ad selection logic

    if (selectedAd) {
        return (
            <div className="min-h-screen bg-gray-50">
                <SEO
                    title={selectedAd.title}
                    description={`${formatPrice(selectedAd.price)} — ${(selectedAd.description || '').slice(0, 155)}`}
                    image={selectedAd.images[0]}
                    url={toAbsoluteUrl(`/anuncio/${selectedAd.id}`)}
                    canonicalUrl={toAbsoluteUrl(`/anuncio/${selectedAd.id}`)}
                    type="article"
                    ogTitle="Dezzapego"
                    ogDescription={selectedAd.title}
                />
                <Header
                    selectedState={selectedState}
                    selectedCity={selectedCity}
                    onLocationChange={handleHeaderLocationChange}
                />
                <Suspense fallback={<SectionFallback className="mx-auto mt-8 h-[60vh] max-w-5xl" />}>
                    <AdDetails
                        ad={selectedAd}
                        onBack={() => setSelectedAd(null)}
                        isFavorite={favorites.has(selectedAd.id)}
                        onToggleFavorite={() => toggleFavorite(selectedAd.id)}
                    />
                </Suspense>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <SEO
                title={listingSeo.title}
                description={listingSeo.description}
                keywords={listingSeo.keywords}
                canonicalUrl={listingSeo.canonicalUrl}
                structuredData={listingStructuredData}
                ogTitle="Dezzapego"
                ogDescription="Imóveis, carros, eletrônicos e mais. Publique anúncios grátis no Dezzapego."
            />
            <Header
                selectedState={selectedState}
                selectedCity={selectedCity}
                onLocationChange={handleHeaderLocationChange}
            />
            <Hero />
            <Suspense fallback={<SectionFallback className="mx-auto mt-6 h-36 max-w-[1600px]" />}>
                <Categories
                    selectedCategory={selectedCategory}
                    onCategorySelect={handleCategorySelect}
                    selectedSubcategory={selectedSubcategory}
                    onSubcategorySelect={handleSubcategorySelect}
                    selectedTransactionType={selectedTransactionType}
                    onTransactionTypeSelect={handleTransactionTypeSelect}
                />
            </Suspense>
            <div className="max-w-[1600px] mx-auto px-2 md:px-4 pt-4">
                <AdSenseSlot
                    slot={import.meta.env.VITE_ADSENSE_HOME_TOP_SLOT}
                    format="auto"
                    minHeightClass="min-h-[120px]"
                    className="hidden md:block"
                />
                <AdSenseSlot
                    slot={import.meta.env.VITE_ADSENSE_HOME_MOBILE_SLOT}
                    format="auto"
                    minHeightClass="min-h-[100px]"
                    className="md:hidden"
                />
            </div>
            <div className="max-w-[1600px] mx-auto px-2 md:px-4 py-4 md:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
                    <aside className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-24 self-start">
                        <Suspense fallback={<SectionFallback className="h-96" />}>
                            <Filters
                                selectedCategory={selectedCategory}
                                selectedSubcategory={selectedSubcategory}
                                selectedState={selectedState}
                                onStateChange={(state) => updateSearchParams({ state, city: '' })} // Reset city when state changes
                                selectedCity={selectedCity}
                                onCityChange={(city) => updateSearchParams({ city })}
                                advertiserType={advertiserType}
                                onAdvertiserTypeChange={(type) => updateSearchParams({ advertiserType: type })}
                                sortBy={sortBy}
                                onSortByChange={(nextSortBy) => updateSearchParams({ sortBy: nextSortBy })}
                                priceRange={priceRange}
                                onPriceRangeChange={handlePriceRangeChange}
                                detailsFilters={detailsFilters}
                                onDetailsFilterChange={setDetailsFilters}
                                radius={radius}
                                onRadiusChange={handleRadiusChange}
                                userLocation={userLocation}
                                onUserLocationChange={setUserLocation}
                            />
                        </Suspense>
                    </aside>
                    <main className="lg:col-span-8 xl:col-span-9">
                        <Suspense fallback={<SectionFallback className="h-[32rem]" />}>
                            <AdsList
                                selectedCategory={selectedCategory}
                                selectedSubcategory={selectedSubcategory}
                                selectedTransactionType={selectedTransactionType}
                                selectedState={selectedState}
                                selectedCity={selectedCity}
                                advertiserType={advertiserType}
                                sortBy={sortBy}
                                priceRange={priceRange}
                                searchQuery={searchQuery}
                                onAdClick={setSelectedAd}
                                favorites={favorites}
                                onToggleFavorite={toggleFavorite}
                                detailsFilters={detailsFilters}
                                radius={radius}
                                userLocation={userLocation}
                            />
                        </Suspense>
                    </main>
                </div>
            </div>
        </div>
    );
}
